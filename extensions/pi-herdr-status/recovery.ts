export type ExpectedHerdrState = "working" | "blocked" | "settled";

export interface BlockedReport {
	active: boolean;
	label?: string;
}

export interface RecoverySnapshot {
	enabled: boolean;
	agentActive: boolean;
	promptActive: boolean;
	externalBlockers: number;
	expected?: ExpectedHerdrState;
	observed?: string;
	consecutiveFailures: number;
	recoveryPulses: number;
}

export interface RecoveryDependencies {
	readObservedState: (signal: AbortSignal) => Promise<string | undefined>;
	emitBlocked: (report: BlockedReport) => void;
	schedule?: (callback: () => void, delayMs: number) => () => void;
	initialDelayMs?: number;
	heartbeatMs?: number;
	retryDelaysMs?: readonly number[];
}

const DEFAULT_RETRY_DELAYS = [750, 1_500, 3_000, 6_000, 30_000] as const;

export function activeAtSessionStart(idle: unknown): boolean {
	return idle === false;
}

export function shouldAcceptSettled(idle: unknown): boolean {
	return idle === true;
}

function defaultSchedule(callback: () => void, delayMs: number): () => void {
	const timer = setTimeout(callback, delayMs);
	timer.unref?.();
	return () => clearTimeout(timer);
}

function observedMatches(expected: ExpectedHerdrState, observed: string | undefined): boolean {
	if (observed === "blocked" && expected !== "blocked") return true;
	if (expected === "settled") return observed === "idle" || observed === "done";
	return observed === expected;
}

export class LifecycleRecovery {
	private readonly readObservedState: (signal: AbortSignal) => Promise<string | undefined>;
	private readonly emitBlocked: (report: BlockedReport) => void;
	private readonly scheduleCallback: (callback: () => void, delayMs: number) => () => void;
	private readonly initialDelayMs: number;
	private readonly heartbeatMs: number;
	private readonly retryDelaysMs: readonly number[];
	private cancelTimer?: () => void;
	private activeRead?: AbortController;
	private generation = 0;
	private enabled = false;
	private agentActive = false;
	private promptActive = false;
	private promptLabel = "Waiting for user";
	private externalBlockers = 0;
	private observed?: string;
	private consecutiveFailures = 0;
	private recoveryPulses = 0;

	constructor(dependencies: RecoveryDependencies) {
		this.readObservedState = dependencies.readObservedState;
		this.emitBlocked = dependencies.emitBlocked;
		this.scheduleCallback = dependencies.schedule ?? defaultSchedule;
		this.initialDelayMs = dependencies.initialDelayMs ?? 750;
		this.heartbeatMs = dependencies.heartbeatMs ?? 30_000;
		this.retryDelaysMs = dependencies.retryDelaysMs ?? DEFAULT_RETRY_DELAYS;
	}

	start(mode: unknown, agentActive = false): void {
		this.cancelPending();
		const wasEnabled = this.enabled;
		this.enabled = mode === "tui";
		this.agentActive = agentActive;
		this.promptActive = false;
		if (!wasEnabled || !this.enabled) this.externalBlockers = 0;
		this.observed = undefined;
		this.consecutiveFailures = 0;
		this.generation += 1;
		if (!this.enabled) return;
		this.scheduleCheck(this.initialDelayMs, this.generation);
	}

	agentStarted(): void {
		if (!this.enabled) return;
		this.agentActive = true;
		this.changed();
	}

	agentSettled(): void {
		if (!this.enabled) return;
		this.agentActive = false;
		this.changed();
	}

	promptStarted(label: string): void {
		if (!this.enabled || this.promptActive) return;
		this.promptActive = true;
		this.promptLabel = label;
		this.changed();
	}

	promptEnded(): void {
		if (!this.enabled || !this.promptActive) return;
		this.promptActive = false;
		this.changed();
	}

	externalBlockedChanged(active: boolean): void {
		if (!this.enabled) return;
		const next = active ? this.externalBlockers + 1 : Math.max(0, this.externalBlockers - 1);
		if (next === this.externalBlockers) return;
		this.externalBlockers = next;
		this.changed();
	}

	stop(): void {
		this.cancelPending();
		this.enabled = false;
		this.agentActive = false;
		this.promptActive = false;
		this.externalBlockers = 0;
		this.observed = undefined;
		this.consecutiveFailures = 0;
		this.generation += 1;
	}

	snapshot(): RecoverySnapshot {
		return {
			enabled: this.enabled,
			agentActive: this.agentActive,
			promptActive: this.promptActive,
			externalBlockers: this.externalBlockers,
			expected: this.enabled ? this.expectedState() : undefined,
			observed: this.observed,
			consecutiveFailures: this.consecutiveFailures,
			recoveryPulses: this.recoveryPulses,
		};
	}

	private changed(): void {
		this.cancelPending();
		this.consecutiveFailures = 0;
		this.generation += 1;
		this.scheduleCheck(this.initialDelayMs, this.generation);
	}

	private expectedState(): ExpectedHerdrState {
		if (this.promptActive) return "blocked";
		return this.agentActive ? "working" : "settled";
	}

	private emitBalancedPulse(expected: ExpectedHerdrState): void {
		this.recoveryPulses += 1;
		if (expected === "blocked") {
			this.emitBlocked({ active: false });
			this.emitBlocked({ active: true, label: this.promptLabel });
			return;
		}
		this.emitBlocked({ active: true, label: "Synchronizing Herdr state" });
		this.emitBlocked({ active: false });
	}

	private cancelPending(): void {
		this.cancelTimer?.();
		this.cancelTimer = undefined;
		this.activeRead?.abort();
		this.activeRead = undefined;
	}

	private scheduleCheck(delayMs: number, generation: number): void {
		this.cancelPending();
		this.cancelTimer = this.scheduleCallback(() => {
			this.cancelTimer = undefined;
			void this.reconcile(generation);
		}, delayMs);
	}

	private async reconcile(generation: number): Promise<void> {
		if (!this.enabled || generation !== this.generation) return;
		const controller = new AbortController();
		this.activeRead = controller;
		let observed: string | undefined;
		try {
			observed = await this.readObservedState(controller.signal);
		} catch {
			observed = undefined;
		}
		if (this.activeRead === controller) this.activeRead = undefined;
		if (!this.enabled || generation !== this.generation || controller.signal.aborted) return;
		this.observed = observed;
		const expected = this.expectedState();
		if (this.externalBlockers > 0 || observedMatches(expected, observed)) {
			this.consecutiveFailures = 0;
			this.scheduleCheck(this.heartbeatMs, generation);
			return;
		}
		if (observed !== undefined) this.emitBalancedPulse(expected);
		this.consecutiveFailures += 1;
		const retryIndex = Math.min(this.consecutiveFailures - 1, this.retryDelaysMs.length - 1);
		const delay = this.retryDelaysMs[retryIndex] ?? this.heartbeatMs;
		this.scheduleCheck(delay, generation);
	}
}
