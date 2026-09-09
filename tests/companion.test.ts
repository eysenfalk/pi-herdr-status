import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	desiredState,
	INITIAL_LIFECYCLE_STATE,
	sanitizeStatusLabel,
	transitionLifecycle,
} from "../extensions/pi-herdr-status/core.ts";
import { herdrSocketEndpoint, sendHerdrRequest } from "../extensions/pi-herdr-status/herdr-rpc.ts";
import piHerdrStatus from "../extensions/pi-herdr-status/index.ts";
import { ReliableHerdrReporter } from "../extensions/pi-herdr-status/recovery.ts";

function started(active = false) {
	return transitionLifecycle(INITIAL_LIFECYCLE_STATE, { type: "session_start", mode: "tui", active });
}

test("root lifecycle reports working then idle only after accepted settlement", () => {
	let state = started();
	assert.deepEqual(desiredState(state), { state: "idle" });
	state = transitionLifecycle(state, { type: "agent_start" });
	assert.deepEqual(desiredState(state), { state: "working", message: undefined });
	state = transitionLifecycle(state, { type: "agent_settled", idle: false });
	assert.deepEqual(desiredState(state), { state: "working", message: undefined });
	state = transitionLifecycle(state, { type: "agent_settled", idle: true });
	assert.deepEqual(desiredState(state), { state: "idle" });
});

test("async busy lease keeps a settled parent semantically working", () => {
	let state = started();
	state = transitionLifecycle(state, { type: "busy", active: true, label: "⏳ 1 subagent (worker)" });
	state = transitionLifecycle(state, { type: "agent_settled", idle: true });
	assert.deepEqual(desiredState(state), { state: "working", message: "⏳ 1 subagent (worker)" });
	state = transitionLifecycle(state, { type: "busy", active: false });
	assert.deepEqual(desiredState(state), { state: "idle" });
});

test("overlapping busy owners are counted independently", () => {
	let state = started();
	state = transitionLifecycle(state, { type: "busy", active: true, label: "first" });
	state = transitionLifecycle(state, { type: "busy", active: true, label: "second" });
	state = transitionLifecycle(state, { type: "busy", active: false });
	assert.equal(state.busyCount, 1);
	assert.deepEqual(desiredState(state), { state: "working", message: undefined });
	state = transitionLifecycle(state, { type: "busy", active: false });
	state = transitionLifecycle(state, { type: "busy", active: false });
	assert.equal(state.busyCount, 0);
	assert.equal(desiredState(state)?.state, "idle");
});

test("partial blocker release clears an ambiguous owner label", () => {
	let state = started();
	state = transitionLifecycle(state, { type: "blocked", active: true, label: "first" });
	state = transitionLifecycle(state, { type: "blocked", active: true, label: "second" });
	state = transitionLifecycle(state, { type: "blocked", active: false });
	assert.equal(state.blockedCount, 1);
	assert.deepEqual(desiredState(state), { state: "blocked", message: undefined });
	state = transitionLifecycle(state, { type: "blocked", active: false });
	assert.deepEqual(desiredState(state), { state: "idle" });
});

test("final busy release preserves an active parent", () => {
	let state = started(true);
	state = transitionLifecycle(state, { type: "busy", active: true, label: "background work" });
	state = transitionLifecycle(state, { type: "busy", active: false });
	assert.deepEqual(desiredState(state), { state: "working", message: undefined });
});

test("busy restoration works before or after session start", () => {
	let busyFirst = transitionLifecycle(INITIAL_LIFECYCLE_STATE, {
		type: "busy",
		active: true,
		label: "restored async work",
	});
	busyFirst = transitionLifecycle(busyFirst, { type: "session_start", mode: "tui", active: false });
	assert.deepEqual(desiredState(busyFirst), { state: "working", message: "restored async work" });

	let sessionFirst = started();
	sessionFirst = transitionLifecycle(sessionFirst, { type: "busy", active: true, label: "restored async work" });
	assert.deepEqual(desiredState(sessionFirst), { state: "working", message: "restored async work" });
});

test("prompt and external attention override busy without consuming it", () => {
	let state = started();
	state = transitionLifecycle(state, { type: "busy", active: true, label: "background work" });
	state = transitionLifecycle(state, { type: "blocked", active: true, label: "subagent needs attention" });
	assert.deepEqual(desiredState(state), { state: "blocked", message: "subagent needs attention" });
	state = transitionLifecycle(state, { type: "prompt_start", kind: "confirm" });
	assert.deepEqual(desiredState(state), { state: "blocked", message: "Waiting for user confirmation" });
	state = transitionLifecycle(state, { type: "prompt_end" });
	state = transitionLifecycle(state, { type: "blocked", active: false });
	assert.deepEqual(desiredState(state), { state: "working", message: "background work" });
});

test("native prompts use fixed labels and never inspect prompt content", () => {
	let state = started();
	state = transitionLifecycle(state, { type: "prompt_start", kind: "input" });
	assert.deepEqual(desiredState(state), { state: "blocked", message: "Waiting for user input" });
	state = transitionLifecycle(state, { type: "prompt_end" });
	assert.deepEqual(desiredState(state), { state: "idle" });
});

test("headless sessions and malformed sibling events stay inert", () => {
	let state = transitionLifecycle(INITIAL_LIFECYCLE_STATE, { type: "busy", active: "yes", label: "ignored" });
	state = transitionLifecycle(state, { type: "session_start", mode: "rpc", active: true });
	assert.equal(desiredState(state), undefined);
	assert.equal(state.busyCount, 0);
});

test("status labels strip controls, normalize whitespace, and are bounded", () => {
	assert.equal(sanitizeStatusLabel("  hello\n\u0000 world  "), "hello world");
	assert.equal([...(sanitizeStatusLabel("x".repeat(300)) ?? "")].length, 160);
	assert.equal(sanitizeStatusLabel(42), undefined);
});

test("reliable reporter serializes session before state and increases sequence", async () => {
	const requests: Record<string, any>[] = [];
	const reporter = new ReliableHerdrReporter({
		paneId: "w1:p1",
		send: async (request) => {
			requests.push(request);
			return true;
		},
	});
	reporter.queueSession({ agent_session_id: "session-1" }, "startup");
	reporter.queueState({ state: "working", message: "background" });
	await reporter.flush();
	assert.deepEqual(
		requests.map((request) => request.method),
		["pane.report_agent_session", "pane.report_agent"],
	);
	assert.ok(requests[1]?.params.seq > requests[0]?.params.seq);
	assert.equal(requests[1]?.params.agent_session_id, "session-1");
	reporter.dispose();
});

test("session replacement aborts stale state and republishes it after the new session", async () => {
	const delivered: Array<{ method: string; session?: string; state?: string }> = [];
	let staleStateStarted!: () => void;
	const staleStateReady = new Promise<void>((resolve) => {
		staleStateStarted = resolve;
	});
	const reporter = new ReliableHerdrReporter({
		paneId: "w1:p1",
		send: (request, _timeout, signal) => {
			const params = request.params as any;
			if (request.method === "pane.report_agent" && params.agent_session_id === "session-1") {
				staleStateStarted();
				return new Promise((resolve) => signal.addEventListener("abort", () => resolve(false), { once: true }));
			}
			delivered.push({ method: request.method as string, session: params.agent_session_id, state: params.state });
			return Promise.resolve(true);
		},
	});
	reporter.queueSession({ agent_session_id: "session-1" }, "startup");
	reporter.queueState({ state: "working" });
	await staleStateReady;
	reporter.queueSession({ agent_session_id: "session-2" }, "switch");
	await reporter.flush();
	assert.deepEqual(delivered, [
		{ method: "pane.report_agent_session", session: "session-1", state: undefined },
		{ method: "pane.report_agent_session", session: "session-2", state: undefined },
		{ method: "pane.report_agent", session: "session-2", state: "working" },
	]);
	reporter.dispose();
});

test("reliable reporter retries a failed latest state with bounded backoff", async () => {
	const attempts: string[] = [];
	const scheduled: Array<{ delay: number; callback: () => void }> = [];
	const reporter = new ReliableHerdrReporter({
		paneId: "w1:p1",
		send: async (request) => {
			attempts.push((request.params as any).state);
			return attempts.length > 2;
		},
		retryDelaysMs: [25, 50],
		schedule: (callback, delay) => {
			scheduled.push({ delay, callback });
			return () => {};
		},
	});
	reporter.queueState({ state: "idle" });
	await reporter.flush();
	assert.deepEqual(attempts, ["idle", "idle"]);
	assert.equal(scheduled[0]?.delay, 25);
	scheduled.shift()?.callback();
	await reporter.flush();
	assert.equal(attempts.at(-1), "idle");
	assert.equal(reporter.snapshot().stateDirty, false);
	reporter.dispose();
});

test("a newer state aborts stale delivery and wins", async () => {
	const delivered: string[] = [];
	let releaseFirst!: () => void;
	const reporter = new ReliableHerdrReporter({
		paneId: "w1:p1",
		send: (request, _timeout, signal) => {
			const state = (request.params as any).state as string;
			if (state === "working") {
				return new Promise((resolve) => {
					releaseFirst = () => resolve(false);
					signal.addEventListener("abort", () => resolve(false), { once: true });
				});
			}
			delivered.push(state);
			return Promise.resolve(true);
		},
	});
	reporter.queueState({ state: "working" });
	await new Promise((resolve) => setImmediate(resolve));
	reporter.queueState({ state: "idle" });
	releaseFirst();
	await reporter.flush();
	assert.deepEqual(delivered, ["idle"]);
	reporter.dispose();
});

test("disposing during delivery aborts the socket work without stale retry", async () => {
	let aborted = false;
	const scheduled: Array<() => void> = [];
	const reporter = new ReliableHerdrReporter({
		paneId: "w1:p1",
		send: (_request, _timeout, signal) =>
			new Promise((resolve) => {
				signal.addEventListener(
					"abort",
					() => {
						aborted = true;
						resolve(false);
					},
					{ once: true },
				);
			}),
		schedule: (callback) => {
			scheduled.push(callback);
			return () => {};
		},
	});
	reporter.queueState({ state: "working" });
	await new Promise((resolve) => setImmediate(resolve));
	reporter.dispose();
	await reporter.flush();
	assert.equal(aborted, true);
	assert.deepEqual(scheduled, []);
	assert.equal(reporter.snapshot().disposed, true);
});

test("heartbeat republishes the current authoritative state and stops on disposal", async () => {
	const callbacks: Array<() => void> = [];
	let reports = 0;
	let cleared = 0;
	const reporter = new ReliableHerdrReporter({
		paneId: "w1:p1",
		send: async () => {
			reports += 1;
			return true;
		},
		intervals: {
			setInterval: ((callback: () => void) => {
				callbacks.push(callback);
				return { unref() {} };
			}) as any,
			clearInterval: (() => {
				cleared += 1;
			}) as any,
		},
	});
	reporter.queueState({ state: "idle" });
	reporter.startHeartbeat(() => ({ state: "idle" }), 30_000);
	await reporter.flush();
	callbacks[0]?.();
	await reporter.flush();
	assert.equal(reports, 2);
	reporter.dispose();
	assert.equal(cleared, 1);
});

test("Herdr RPC requires a matching non-error acknowledgement", async () => {
	const directory = await mkdtemp(join(tmpdir(), "pi-herdr-status-rpc-"));
	const socketPath = join(directory, "daemon.sock");
	let server: Server | undefined;
	try {
		server = createServer((socket) =>
			respondToRequest(socket, (request) => ({ id: request.id, result: { ok: true } })),
		);
		const acceptingServer = server;
		await new Promise<void>((resolve) => acceptingServer.listen(socketPath, resolve));
		assert.equal(await sendHerdrRequest(socketPath, { method: "pane.report_agent", params: {} }, 500), true);
		await new Promise<void>((resolve) => acceptingServer.close(() => resolve()));
		server = createServer((socket) =>
			respondToRequest(socket, (request) => ({ id: request.id, error: { message: "rejected" } })),
		);
		const rejectingServer = server;
		await new Promise<void>((resolve) => rejectingServer.listen(socketPath, resolve));
		assert.equal(await sendHerdrRequest(socketPath, { method: "pane.report_agent", params: {} }, 500), false);
		assert.equal(herdrSocketEndpoint("herdr-test", "win32"), "\\\\.\\pipe\\herdr-test");
	} finally {
		if (server?.listening) {
			const openServer = server;
			await new Promise<void>((resolve) => openServer.close(() => resolve()));
		}
		await rm(directory, { recursive: true, force: true });
	}
});

test("Herdr RPC rejects oversized responses and supports cancellation", async () => {
	const directory = await mkdtemp(join(tmpdir(), "pi-herdr-status-rpc-bound-"));
	const socketPath = join(directory, "daemon.sock");
	let acceptedSocket: Socket | undefined;
	const server = createServer((socket) => {
		acceptedSocket = socket;
		socket.end("x".repeat(64 * 1024 + 1));
	});
	await new Promise<void>((resolve) => server.listen(socketPath, resolve));
	try {
		assert.equal(await sendHerdrRequest(socketPath, { method: "test" }, 1_000), false);
	} finally {
		acceptedSocket?.destroy();
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(directory, { recursive: true, force: true });
	}
});

test("extension keeps Herdr working through async settlement without idle relabel flicker", async () => {
	const directory = await mkdtemp(join(tmpdir(), "pi-herdr-status-integration-"));
	const socketPath = join(directory, "daemon.sock");
	const requests: Record<string, any>[] = [];
	const server = createServer((socket) =>
		respondToRequest(socket, (request) => {
			requests.push(request);
			return { id: request.id, result: { ok: true } };
		}),
	);
	await new Promise<void>((resolve) => server.listen(socketPath, resolve));
	const previous = {
		herdr: process.env.HERDR_ENV,
		socket: process.env.HERDR_SOCKET_PATH,
		pane: process.env.HERDR_PANE_ID,
	};
	try {
		process.env.HERDR_ENV = "1";
		process.env.HERDR_SOCKET_PATH = socketPath;
		process.env.HERDR_PANE_ID = "w1:p1";
		const lifecycle = new Map<string, (event: any, ctx: any) => unknown>();
		const bus = new Map<string, Set<(payload: unknown) => void>>();
		const pi = {
			on(name: string, handler: (event: any, ctx: any) => unknown) {
				lifecycle.set(name, handler);
			},
			events: {
				on(name: string, handler: (payload: unknown) => void) {
					const handlers = bus.get(name) ?? new Set();
					handlers.add(handler);
					bus.set(name, handlers);
					return () => handlers.delete(handler);
				},
				emit(name: string, payload: unknown) {
					for (const handler of bus.get(name) ?? []) handler(payload);
				},
			},
		};
		piHerdrStatus(pi as any);
		await lifecycle.get("session_start")?.({ reason: "startup" }, { mode: "tui", isIdle: () => true });
		await waitFor(() => stateRequests(requests).at(-1)?.params.state === "idle");
		pi.events.emit("herdr:busy", { active: true, label: "⏳ 1 subagent (worker)" });
		await lifecycle.get("agent_settled")?.({}, { isIdle: () => true });
		await waitFor(() => stateRequests(requests).at(-1)?.params.state === "working");
		const beforeRelabel = stateRequests(requests).length;
		pi.events.emit("herdr:busy", { active: false });
		pi.events.emit("herdr:busy", { active: true, label: "⏳ 1 subagent (reviewer)" });
		await waitFor(() => stateRequests(requests).at(-1)?.params.message?.includes("reviewer"));
		assert.deepEqual(
			stateRequests(requests)
				.slice(beforeRelabel)
				.map((request) => request.params.state),
			["working"],
		);
		pi.events.emit("herdr:blocked", { active: true, label: "subagent needs attention" });
		await waitFor(() => stateRequests(requests).at(-1)?.params.state === "blocked");
		pi.events.emit("herdr:blocked", { active: false });
		pi.events.emit("herdr:busy", { active: false });
		await waitFor(() => stateRequests(requests).at(-1)?.params.state === "idle");
		await lifecycle.get("session_shutdown")?.({}, {});
	} finally {
		if (previous.herdr === undefined) delete process.env.HERDR_ENV;
		else process.env.HERDR_ENV = previous.herdr;
		if (previous.socket === undefined) delete process.env.HERDR_SOCKET_PATH;
		else process.env.HERDR_SOCKET_PATH = previous.socket;
		if (previous.pane === undefined) delete process.env.HERDR_PANE_ID;
		else process.env.HERDR_PANE_ID = previous.pane;
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(directory, { recursive: true, force: true });
	}
});

function respondToRequest(socket: Socket, response: (request: Record<string, any>) => unknown): void {
	let buffer = "";
	socket.setEncoding("utf8");
	socket.on("data", (chunk) => {
		buffer += chunk;
		const newline = buffer.indexOf("\n");
		if (newline < 0) return;
		const request = JSON.parse(buffer.slice(0, newline));
		socket.end(`${JSON.stringify(response(request))}\n`);
	});
}

function stateRequests(requests: Record<string, any>[]): Record<string, any>[] {
	return requests.filter((request) => request.method === "pane.report_agent");
}

async function waitFor(predicate: () => boolean, timeoutMs = 1_500): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (!predicate()) {
		if (Date.now() >= deadline) throw new Error("timed out waiting for condition");
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}
