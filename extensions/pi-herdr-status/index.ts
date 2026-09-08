import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type BridgeEvent, type BridgeState, INITIAL_BRIDGE_STATE, transitionBridge } from "./core.ts";
import { herdrSocketEndpoint, readHerdrPaneState } from "./herdr-rpc.ts";
import { activeAtSessionStart, LifecycleRecovery, shouldAcceptSettled } from "./recovery.ts";

/**
 * Update-safe status companion for Herdr's managed Pi integration.
 *
 * Herdr owns extensions/herdr-agent-state.ts and may overwrite it on update.
 * This separate extension translates Pi's native blocking-UI lifecycle into
 * Herdr's existing event surface and reconciles dropped lifecycle reports.
 */
const COMPANION_EVENT_ORIGIN = "pi-herdr-status";

export default function piHerdrStatus(pi: ExtensionAPI): void {
	let state: BridgeState = INITIAL_BRIDGE_STATE;
	const emitCompanionBlock = (report: { active: boolean; label?: string }) =>
		pi.events.emit("herdr:blocked", { ...report, companionOrigin: COMPANION_EVENT_ORIGIN });
	const socketEndpoint = herdrSocketEndpoint(process.env.HERDR_SOCKET_PATH);
	const paneId = process.env.HERDR_PANE_ID;
	const recoveryEnabled = process.env.HERDR_ENV === "1" && !!socketEndpoint && !!paneId;
	const recovery = new LifecycleRecovery({
		readObservedState: (signal) => readHerdrPaneState(socketEndpoint, paneId, 1_000, signal),
		emitBlocked: emitCompanionBlock,
	});

	function dispatch(event: BridgeEvent) {
		const next = transitionBridge(state, event);
		state = next.state;
		if (next.report) emitCompanionBlock(next.report);
		return next.report;
	}

	pi.events.on("herdr:blocked", (payload: any) => {
		if (payload?.companionOrigin === COMPANION_EVENT_ORIGIN) return;
		recovery.externalBlockedChanged(!!payload?.active);
	});

	pi.on("session_start", (_event, ctx) => {
		dispatch({ type: "session_start", mode: ctx.mode });
		const active = activeAtSessionStart(ctx.isIdle?.());
		recovery.start(recoveryEnabled ? ctx.mode : undefined, active);
	});

	pi.on("agent_start", () => {
		recovery.agentStarted();
	});

	pi.on("agent_settled", (_event, ctx) => {
		if (shouldAcceptSettled(ctx.isIdle?.())) recovery.agentSettled();
	});

	pi.on("ui_prompt_start", (event) => {
		const report = dispatch({ type: "prompt_start", kind: event.kind });
		if (report?.active) recovery.promptStarted(report.label ?? "Waiting for user");
	});

	pi.on("ui_prompt_end", () => {
		const report = dispatch({ type: "prompt_end" });
		if (report?.active === false) recovery.promptEnded();
	});

	pi.on("session_shutdown", () => {
		recovery.stop();
		dispatch({ type: "session_shutdown" });
	});
}
