// Downstream split of Herdr's Pi integration lifecycle behavior.
// Derived from herdrdev/herdr src/integration/assets/pi/herdr-agent-state.ts
// at v0.9.0 (b99002ac99b09e00b4ca692436cb15a6b0d676f1); substantially modified.

export type AgentState = "working" | "blocked" | "idle";
export type PromptKind = "select" | "confirm" | "input" | "editor" | "custom";

export interface LifecycleState {
	rootSession: boolean;
	agentActive: boolean;
	promptActive: boolean;
	promptLabel?: string;
	blockedCount: number;
	blockedLabel?: string;
	busyCount: number;
	busyLabel?: string;
}

export type LifecycleEvent =
	| { type: "session_start"; mode: unknown; active: boolean }
	| { type: "agent_start" }
	| { type: "agent_settled"; idle: unknown }
	| { type: "prompt_start"; kind?: unknown }
	| { type: "prompt_end" }
	| { type: "blocked"; active: unknown; label?: unknown }
	| { type: "busy"; active: unknown; label?: unknown }
	| { type: "session_shutdown" };

export interface StateReport {
	state: AgentState;
	message?: string;
}

export const INITIAL_LIFECYCLE_STATE: LifecycleState = {
	rootSession: false,
	agentActive: false,
	promptActive: false,
	blockedCount: 0,
	busyCount: 0,
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

export function sanitizeStatusLabel(value: unknown, maxChars = 160): string | undefined {
	if (typeof value !== "string") return undefined;
	const normalized = [...value]
		.map((character) => {
			const codePoint = character.codePointAt(0) ?? 0;
			return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159) ? " " : character;
		})
		.join("")
		.replace(/\s+/gu, " ")
		.trim();
	if (!normalized) return undefined;
	return [...normalized].slice(0, maxChars).join("");
}

export function transitionLifecycle(state: LifecycleState, event: LifecycleEvent): LifecycleState {
	switch (event.type) {
		case "session_start":
			if (event.mode !== "tui") return { ...INITIAL_LIFECYCLE_STATE };
			return {
				...state,
				rootSession: true,
				agentActive: event.active,
				promptActive: false,
				promptLabel: undefined,
			};
		case "agent_start":
			return state.rootSession ? { ...state, agentActive: true } : state;
		case "agent_settled":
			return state.rootSession && event.idle === true ? { ...state, agentActive: false } : state;
		case "prompt_start":
			if (!state.rootSession || state.promptActive) return state;
			return { ...state, promptActive: true, promptLabel: promptLabel(event.kind) };
		case "prompt_end":
			if (!state.rootSession || !state.promptActive) return state;
			return { ...state, promptActive: false, promptLabel: undefined };
		case "blocked": {
			if (event.active !== true && event.active !== false) return state;
			const blockedCount = event.active ? state.blockedCount + 1 : Math.max(0, state.blockedCount - 1);
			return {
				...state,
				blockedCount,
				blockedLabel: event.active ? sanitizeStatusLabel(event.label) : undefined,
			};
		}
		case "busy": {
			if (event.active !== true && event.active !== false) return state;
			const busyCount = event.active ? state.busyCount + 1 : Math.max(0, state.busyCount - 1);
			return {
				...state,
				busyCount,
				busyLabel: event.active ? sanitizeStatusLabel(event.label) : undefined,
			};
		}
		case "session_shutdown":
			return { ...INITIAL_LIFECYCLE_STATE };
	}
}

export function desiredState(state: LifecycleState): StateReport | undefined {
	if (!state.rootSession) return undefined;
	if (state.promptActive || state.blockedCount > 0) {
		return {
			state: "blocked",
			message: state.promptActive ? state.promptLabel : state.blockedLabel,
		};
	}
	if (state.agentActive || state.busyCount > 0) {
		return { state: "working", message: state.busyCount > 0 ? state.busyLabel : undefined };
	}
	return { state: "idle" };
}
