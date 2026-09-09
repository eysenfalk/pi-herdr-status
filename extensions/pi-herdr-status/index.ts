// Standalone downstream fork of Herdr's Pi integration.
// Derived from herdrdev/herdr src/integration/assets/pi/herdr-agent-state.ts
// at b9ce14fb9970dbebcff52a620e4247b88265678a; substantially modified.
// HERDR_INTEGRATION_ID=pi
// HERDR_INTEGRATION_VERSION=8-fork.1

import { isAbsolute } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	desiredState,
	INITIAL_LIFECYCLE_STATE,
	type LifecycleEvent,
	type LifecycleState,
	transitionLifecycle,
} from "./core.ts";
import { herdrSocketEndpoint, sendHerdrRequest } from "./herdr-rpc.ts";
import { ReliableHerdrReporter, type SessionRef } from "./recovery.ts";

const SOURCE = "herdr:pi";
const HEARTBEAT_MS = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sessionRef(ctx: any): SessionRef {
	try {
		const path = ctx?.sessionManager?.getSessionFile?.();
		if (typeof path === "string" && isAbsolute(path)) return { agent_session_path: path };
	} catch {}
	try {
		const id = ctx?.sessionManager?.getSessionId?.();
		if (typeof id === "string" && id.length > 0) return { agent_session_id: id };
	} catch {}
	return {};
}

/**
 * Single-authority Herdr lifecycle integration for Pi.
 *
 * This replaces (and must not be co-installed with) Herdr's managed
 * herdr-agent-state.ts. It keeps the upstream source/sequence authority while
 * adding native prompt state, async-work leases, and reliable heartbeat repair.
 */
export default function piHerdrStatus(pi: ExtensionAPI): void {
	const endpoint = herdrSocketEndpoint(process.env.HERDR_SOCKET_PATH);
	const paneId = process.env.HERDR_PANE_ID;
	if (process.env.HERDR_ENV !== "1" || !endpoint || !paneId) return;

	let lifecycle: LifecycleState = { ...INITIAL_LIFECYCLE_STATE };
	let publishScheduled = false;
	let forceScheduled = false;
	let stopped = false;
	const reporter = new ReliableHerdrReporter({
		paneId,
		source: SOURCE,
		send: (request, timeoutMs, signal) => sendHerdrRequest(endpoint, request, timeoutMs, signal),
	});

	const publish = (force = false): void => {
		const report = desiredState(lifecycle);
		if (report) reporter.queueState(report, force);
	};
	const schedulePublish = (force = false): void => {
		if (stopped) return;
		forceScheduled ||= force;
		if (publishScheduled) return;
		publishScheduled = true;
		queueMicrotask(() => {
			publishScheduled = false;
			const shouldForce = forceScheduled;
			forceScheduled = false;
			publish(shouldForce);
		});
	};
	const dispatch = (event: LifecycleEvent, force = false): void => {
		const next = transitionLifecycle(lifecycle, event);
		if (next === lifecycle && !force) return;
		lifecycle = next;
		schedulePublish(force);
	};

	const unsubscribeBlocked = pi.events.on("herdr:blocked", (payload: unknown) => {
		if (!isRecord(payload)) return;
		dispatch({ type: "blocked", active: payload.active, label: payload.label });
	});
	const unsubscribeBusy = pi.events.on("herdr:busy", (payload: unknown) => {
		if (!isRecord(payload)) return;
		dispatch({ type: "busy", active: payload.active, label: payload.label });
	});

	pi.on("session_start", (event, ctx) => {
		const active = ctx?.isIdle?.() === false;
		dispatch({ type: "session_start", mode: ctx?.mode, active }, true);
		if (ctx?.mode !== "tui") return;
		reporter.queueSession(sessionRef(ctx), event?.reason);
		reporter.startHeartbeat(() => desiredState(lifecycle), HEARTBEAT_MS);
	});

	pi.on("agent_start", (_event, ctx) => {
		if (!lifecycle.rootSession) return;
		reporter.queueSession(sessionRef(ctx));
		dispatch({ type: "agent_start" });
	});

	pi.on("agent_settled", (_event, ctx) => {
		dispatch({ type: "agent_settled", idle: ctx?.isIdle?.() });
	});

	pi.on("ui_prompt_start", (event) => {
		dispatch({ type: "prompt_start", kind: event?.kind });
	});

	pi.on("ui_prompt_end", () => {
		dispatch({ type: "prompt_end" });
	});

	pi.on("session_shutdown", () => {
		stopped = true;
		lifecycle = transitionLifecycle(lifecycle, { type: "session_shutdown" });
		if (typeof unsubscribeBlocked === "function") unsubscribeBlocked();
		if (typeof unsubscribeBusy === "function") unsubscribeBusy();
		reporter.dispose();
	});
}
