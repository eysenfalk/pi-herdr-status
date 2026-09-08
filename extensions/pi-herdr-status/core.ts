export type PromptKind = "select" | "confirm" | "input" | "editor" | "custom";

export interface BridgeState {
	tuiSession: boolean;
	promptActive: boolean;
}

export type BridgeEvent =
	| { type: "session_start"; mode: unknown }
	| { type: "prompt_start"; kind?: unknown }
	| { type: "prompt_end" }
	| { type: "session_shutdown" };

export interface BlockedReport {
	active: boolean;
	label?: string;
}

export interface BridgeTransition {
	state: BridgeState;
	report?: BlockedReport;
}

export const INITIAL_BRIDGE_STATE: BridgeState = {
	tuiSession: false,
	promptActive: false,
};

const PROMPT_LABELS: Record<PromptKind, string> = {
	select: "Waiting for user selection",
	confirm: "Waiting for user confirmation",
	input: "Waiting for user input",
	editor: "Waiting for user input",
	custom: "Waiting for user",
};

function promptLabel(kind: unknown): string {
	return typeof kind === "string" && kind in PROMPT_LABELS ? PROMPT_LABELS[kind as PromptKind] : "Waiting for user";
}

export function transitionBridge(state: BridgeState, event: BridgeEvent): BridgeTransition {
	switch (event.type) {
		case "session_start": {
			const tuiSession = event.mode === "tui";
			return {
				state: { tuiSession, promptActive: false },
				report: state.promptActive ? { active: false } : undefined,
			};
		}
		case "prompt_start":
			if (!state.tuiSession || state.promptActive) return { state };
			return {
				state: { ...state, promptActive: true },
				report: { active: true, label: promptLabel(event.kind) },
			};
		case "prompt_end":
			if (!state.tuiSession || !state.promptActive) return { state };
			return {
				state: { ...state, promptActive: false },
				report: { active: false },
			};
		case "session_shutdown":
			return {
				state: INITIAL_BRIDGE_STATE,
				report: state.promptActive ? { active: false } : undefined,
			};
	}
}
