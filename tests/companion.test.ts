import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { INITIAL_BRIDGE_STATE, transitionBridge } from "../extensions/pi-herdr-status/core.ts";
import { herdrSocketEndpoint, readHerdrPaneState } from "../extensions/pi-herdr-status/herdr-rpc.ts";
import piHerdrStatus from "../extensions/pi-herdr-status/index.ts";
import {
	activeAtSessionStart,
	type BlockedReport,
	LifecycleRecovery,
	shouldAcceptSettled,
} from "../extensions/pi-herdr-status/recovery.ts";

test("pure bridge reports one balanced blocked span", () => {
	let result = transitionBridge(INITIAL_BRIDGE_STATE, { type: "session_start", mode: "tui" });
	assert.equal(result.report, undefined);

	result = transitionBridge(result.state, { type: "prompt_start", kind: "confirm" });
	assert.deepEqual(result.report, {
		active: true,
		label: "Waiting for user confirmation",
	});

	const duplicate = transitionBridge(result.state, { type: "prompt_start", kind: "confirm" });
	assert.equal(duplicate.report, undefined);

	result = transitionBridge(duplicate.state, { type: "prompt_end" });
	assert.deepEqual(result.report, { active: false });
	assert.equal(transitionBridge(result.state, { type: "prompt_end" }).report, undefined);
});

test("pure bridge ignores headless sessions", () => {
	const started = transitionBridge(INITIAL_BRIDGE_STATE, { type: "session_start", mode: "rpc" });
	const prompt = transitionBridge(started.state, { type: "prompt_start", kind: "select" });
	assert.equal(prompt.report, undefined);
});

test("pure bridge clears an open prompt on shutdown", () => {
	const started = transitionBridge(INITIAL_BRIDGE_STATE, { type: "session_start", mode: "tui" });
	const prompt = transitionBridge(started.state, { type: "prompt_start", kind: "custom" });
	const shutdown = transitionBridge(prompt.state, { type: "session_shutdown" });
	assert.deepEqual(shutdown.report, { active: false });
	assert.deepEqual(shutdown.state, INITIAL_BRIDGE_STATE);
});

test("confirmed stale state triggers one balanced recovery pulse", async () => {
	const reports: BlockedReport[] = [];
	let blockedCount = 0;
	let scheduled: (() => void) | undefined;
	const recovery = new LifecycleRecovery({
		readObservedState: async () => "working",
		emitBlocked: (report) => {
			reports.push(report);
			blockedCount = report.active ? blockedCount + 1 : Math.max(0, blockedCount - 1);
		},
		schedule: (callback) => {
			scheduled = callback;
			return () => {};
		},
	});

	recovery.start("tui");
	assert.deepEqual(reports, []);
	scheduled?.();
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(reports, [{ active: true, label: "Synchronizing Herdr state" }, { active: false }]);
	assert.equal(blockedCount, 0);
});

test("recovery corrects stale state and backs off boundedly", async () => {
	const reports: BlockedReport[] = [];
	const scheduled: Array<{ delay: number; callback: () => void; cancelled: boolean }> = [];
	const observed = [undefined, "working", "done"];
	const recovery = new LifecycleRecovery({
		readObservedState: async () => observed.shift(),
		emitBlocked: (report) => reports.push(report),
		initialDelayMs: 10,
		heartbeatMs: 1_000,
		retryDelaysMs: [20, 40],
		schedule: (callback, delay) => {
			const task = { delay, callback, cancelled: false };
			scheduled.push(task);
			return () => {
				task.cancelled = true;
			};
		},
	});
	const runLatest = async () => {
		const task = scheduled.find((candidate) => !candidate.cancelled);
		assert.ok(task);
		task.cancelled = true;
		task.callback();
		await new Promise((resolve) => setImmediate(resolve));
	};

	recovery.start("tui");
	assert.equal(scheduled[0]?.delay, 10);
	await runLatest();
	assert.deepEqual(reports, []);
	assert.equal(scheduled.at(-1)?.delay, 20);
	await runLatest();
	assert.deepEqual(reports, [{ active: true, label: "Synchronizing Herdr state" }, { active: false }]);
	assert.equal(scheduled.at(-1)?.delay, 40);
	await runLatest();
	assert.equal(scheduled.at(-1)?.delay, 1_000);
	assert.equal(recovery.snapshot().consecutiveFailures, 0);
});

test("a legitimate independent blocker suppresses every recovery pulse", async () => {
	const reports: BlockedReport[] = [];
	let scheduled: (() => void) | undefined;
	const recovery = new LifecycleRecovery({
		readObservedState: async () => "working",
		emitBlocked: (report) => reports.push(report),
		schedule: (callback) => {
			scheduled = callback;
			return () => {};
		},
	});
	const reconcile = async () => {
		scheduled?.();
		await new Promise((resolve) => setImmediate(resolve));
	};

	recovery.start("tui");
	recovery.externalBlockedChanged(true);
	await reconcile();
	recovery.agentStarted();
	await reconcile();
	recovery.agentSettled();
	await reconcile();
	recovery.promptStarted("Waiting for user confirmation");
	await reconcile();
	recovery.promptEnded();
	await reconcile();

	assert.deepEqual(reports, []);
	assert.equal(recovery.snapshot().observed, "working");
	assert.equal(recovery.snapshot().externalBlockers, 1);
	assert.equal(recovery.snapshot().consecutiveFailures, 0);
});

test("repeated TUI session start preserves foreign blockers", async () => {
	const reports: BlockedReport[] = [];
	let scheduled: (() => void) | undefined;
	const recovery = new LifecycleRecovery({
		readObservedState: async () => "working",
		emitBlocked: (report) => reports.push(report),
		schedule: (callback) => {
			scheduled = callback;
			return () => {};
		},
	});

	recovery.start("tui");
	recovery.externalBlockedChanged(true);
	recovery.start("tui");
	scheduled?.();
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(recovery.snapshot().externalBlockers, 1);
	assert.deepEqual(reports, []);
});

test("session start mirrors the managed hook's idle authority", () => {
	assert.equal(activeAtSessionStart(false), true);
	assert.equal(activeAtSessionStart(true), false);
	assert.equal(activeAtSessionStart(undefined), false);
});

test("settlement is accepted only when Pi is actually idle", () => {
	assert.equal(shouldAcceptSettled(true), true);
	assert.equal(shouldAcceptSettled(false), false);
	assert.equal(shouldAcceptSettled(undefined), false);
});

test("active reload accepts observed working without recovery", async () => {
	const reports: BlockedReport[] = [];
	let scheduled: (() => void) | undefined;
	const recovery = new LifecycleRecovery({
		readObservedState: async () => "working",
		emitBlocked: (report) => reports.push(report),
		schedule: (callback) => {
			scheduled = callback;
			return () => {};
		},
	});

	recovery.start("tui", true);
	scheduled?.();
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(recovery.snapshot().expected, "working");
	assert.deepEqual(reports, []);
});

test("state changes cancel stale reconciliation work", async () => {
	let resolveRead!: (value: string | undefined) => void;
	let observedSignal: AbortSignal | undefined;
	const reports: BlockedReport[] = [];
	let scheduled: (() => void) | undefined;
	const recovery = new LifecycleRecovery({
		readObservedState: (signal) => {
			observedSignal = signal;
			return new Promise((resolve) => (resolveRead = resolve));
		},
		emitBlocked: (report) => reports.push(report),
		schedule: (callback) => {
			scheduled = callback;
			return () => {};
		},
	});

	recovery.start("tui");
	scheduled?.();
	recovery.agentStarted();
	assert.equal(observedSignal?.aborted, true);
	resolveRead("working");
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(reports, []);
	assert.equal(recovery.snapshot().expected, "working");
});

test("recovery aborts an active read before starting another", async () => {
	const scheduled: Array<() => void> = [];
	let active = 0;
	let maximumActive = 0;
	const recovery = new LifecycleRecovery({
		readObservedState: (signal) =>
			new Promise((resolve) => {
				active += 1;
				maximumActive = Math.max(maximumActive, active);
				signal.addEventListener(
					"abort",
					() => {
						active -= 1;
						resolve(undefined);
					},
					{ once: true },
				);
			}),
		emitBlocked: () => {},
		schedule: (callback) => {
			scheduled.push(callback);
			return () => {};
		},
	});

	recovery.start("tui");
	scheduled.shift()?.();
	assert.equal(active, 1);
	recovery.agentStarted();
	assert.equal(active, 0);
	scheduled.shift()?.();
	assert.equal(active, 1);
	assert.equal(maximumActive, 1);
	recovery.stop();
	assert.equal(active, 0);
	await new Promise((resolve) => setImmediate(resolve));
});

test("pane.get RPC returns only the semantic agent status", async () => {
	const directory = await mkdtemp(join(tmpdir(), "herdr-companion-rpc-"));
	const socketPath = join(directory, "daemon.sock");
	const server = createServer((socket) => {
		let buffer = "";
		socket.setEncoding("utf8");
		socket.on("data", (chunk) => {
			buffer += chunk;
			if (!buffer.includes("\n")) return;
			const request = JSON.parse(buffer.slice(0, buffer.indexOf("\n")));
			assert.equal(request.method, "pane.get");
			assert.deepEqual(request.params, { pane_id: "w1:p2" });
			socket.end(
				`${JSON.stringify({ id: request.id, result: { type: "pane_info", pane: { agent_status: "done", cwd: "/secret/not-forwarded" } } })}\n`,
			);
		});
	});
	await new Promise<void>((resolve) => server.listen(socketPath, resolve));
	try {
		assert.equal(await readHerdrPaneState(socketPath, "w1:p2", 250), "done");
	} finally {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(directory, { recursive: true, force: true });
	}
});

test("pane.get RPC supports cancellation and Windows endpoint normalization", async () => {
	const directory = await mkdtemp(join(tmpdir(), "herdr-companion-abort-"));
	const socketPath = join(directory, "daemon.sock");
	let accepted!: () => void;
	const acceptedConnection = new Promise<void>((resolve) => (accepted = resolve));
	const server = createServer(() => accepted());
	await new Promise<void>((resolve) => server.listen(socketPath, resolve));
	const controller = new AbortController();
	try {
		const pending = readHerdrPaneState(socketPath, "w1:p2", 5_000, controller.signal);
		await acceptedConnection;
		controller.abort();
		assert.equal(await pending, undefined);
		assert.equal(herdrSocketEndpoint("herdr-test", "win32"), "\\\\.\\pipe\\herdr-test");
	} finally {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(directory, { recursive: true, force: true });
	}
});

test("pane.get RPC rejects oversized responses before parsing", async () => {
	const directory = await mkdtemp(join(tmpdir(), "pi-herdr-status-oversized-"));
	const socketPath = join(directory, "daemon.sock");
	let acceptedSocket: Socket | undefined;
	const server = createServer((socket) => {
		acceptedSocket = socket;
		socket.end("x".repeat(64 * 1024 + 1));
	});
	await new Promise<void>((resolve) => server.listen(socketPath, resolve));
	try {
		assert.equal(await readHerdrPaneState(socketPath, "w1:p2", 1_000), undefined);
	} finally {
		acceptedSocket?.destroy();
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(directory, { recursive: true, force: true });
	}
});

test("extension wires prompt and lifecycle events without prompt content", async () => {
	type Handler = (event: any, ctx: any) => unknown;
	const handlers = new Map<string, Handler>();
	const reports: unknown[] = [];
	const pi = {
		on(name: string, handler: Handler) {
			handlers.set(name, handler);
		},
		events: {
			on() {},
			emit(name: string, value: unknown) {
				if (name === "herdr:blocked") reports.push(value);
			},
		},
	};

	piHerdrStatus(pi as any);
	await handlers.get("session_start")?.({ reason: "startup" }, { mode: "tui", isIdle: () => true });
	await handlers.get("ui_prompt_start")?.({ kind: "input", title: "Sensitive prompt" }, {});
	await handlers.get("ui_prompt_end")?.({ kind: "input" }, {});
	await new Promise((resolve) => setImmediate(resolve));

	assert.deepEqual(reports, [
		{
			active: true,
			label: "Waiting for user input",
			companionOrigin: "pi-herdr-status",
		},
		{ active: false, companionOrigin: "pi-herdr-status" },
	]);
	assert.equal(JSON.stringify(reports).includes("Sensitive prompt"), false);
});

test("extension repairs a dropped settled report through the managed event surface", async () => {
	const directory = await mkdtemp(join(tmpdir(), "pi-herdr-status-integration-"));
	const socketPath = join(directory, "daemon.sock");
	const previousEnvironment = {
		herdr: process.env.HERDR_ENV,
		socket: process.env.HERDR_SOCKET_PATH,
		pane: process.env.HERDR_PANE_ID,
	};
	let semanticState = "working";
	let blockedCount = 0;
	const reports: BlockedReport[] = [];
	const lifecycleHandlers = new Map<string, (event: any, ctx: any) => unknown>();
	const blockedHandlers: Array<(report: BlockedReport & { companionOrigin?: string }) => void> = [];
	const server = createServer((socket) => {
		let buffer = "";
		socket.setEncoding("utf8");
		socket.on("data", (chunk) => {
			buffer += chunk;
			const newline = buffer.indexOf("\n");
			if (newline < 0) return;
			const request = JSON.parse(buffer.slice(0, newline));
			socket.end(
				`${JSON.stringify({ id: request.id, result: { type: "pane_info", pane: { agent_status: semanticState } } })}\n`,
			);
		});
	});
	await new Promise<void>((resolve) => server.listen(socketPath, resolve));

	try {
		process.env.HERDR_ENV = "1";
		process.env.HERDR_SOCKET_PATH = socketPath;
		process.env.HERDR_PANE_ID = "w1:p1";
		blockedHandlers.push((report) => {
			blockedCount = report.active ? blockedCount + 1 : Math.max(0, blockedCount - 1);
			semanticState = blockedCount > 0 ? "blocked" : "done";
			reports.push(report);
		});
		const pi = {
			on(name: string, handler: (event: any, ctx: any) => unknown) {
				lifecycleHandlers.set(name, handler);
			},
			events: {
				on(name: string, handler: (report: BlockedReport & { companionOrigin?: string }) => void) {
					if (name === "herdr:blocked") blockedHandlers.push(handler);
				},
				emit(name: string, report: BlockedReport & { companionOrigin?: string }) {
					if (name === "herdr:blocked") for (const handler of blockedHandlers) handler(report);
				},
			},
		};

		piHerdrStatus(pi as any);
		await lifecycleHandlers.get("session_start")?.({}, { mode: "tui", isIdle: () => true });
		await new Promise((resolve) => setTimeout(resolve, 900));

		assert.equal(semanticState, "done");
		assert.equal(blockedCount, 0);
		assert.deepEqual(reports, [
			{ active: true, label: "Synchronizing Herdr state", companionOrigin: "pi-herdr-status" },
			{ active: false, companionOrigin: "pi-herdr-status" },
		]);
		await lifecycleHandlers.get("session_shutdown")?.({}, {});
	} finally {
		if (previousEnvironment.herdr === undefined) delete process.env.HERDR_ENV;
		else process.env.HERDR_ENV = previousEnvironment.herdr;
		if (previousEnvironment.socket === undefined) delete process.env.HERDR_SOCKET_PATH;
		else process.env.HERDR_SOCKET_PATH = previousEnvironment.socket;
		if (previousEnvironment.pane === undefined) delete process.env.HERDR_PANE_ID;
		else process.env.HERDR_PANE_ID = previousEnvironment.pane;
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(directory, { recursive: true, force: true });
	}
});

test("overlapping native prompt preserves a foreign block count but inherits the managed single-label limit", async () => {
	type Handler = (event: any, ctx: any) => unknown;
	const handlers = new Map<string, Handler>();
	let blockedCount = 1;
	let blockedLabel = "Independent blocker";
	const pi = {
		on(name: string, handler: Handler) {
			handlers.set(name, handler);
		},
		events: {
			on() {},
			emit(name: string, value: BlockedReport) {
				if (name !== "herdr:blocked") return;
				if (value.active) {
					blockedCount += 1;
					blockedLabel = value.label ?? "Waiting for user input";
				} else {
					blockedCount = Math.max(0, blockedCount - 1);
					if (blockedCount === 0) blockedLabel = "";
				}
			},
		},
	};

	piHerdrStatus(pi as any);
	await handlers.get("session_start")?.({}, { mode: "tui" });
	await handlers.get("ui_prompt_start")?.({ kind: "input" }, {});
	await handlers.get("ui_prompt_end")?.({}, {});
	await handlers.get("session_shutdown")?.({}, {});

	assert.equal(blockedCount, 1);
	assert.equal(blockedLabel, "Waiting for user input");
});
