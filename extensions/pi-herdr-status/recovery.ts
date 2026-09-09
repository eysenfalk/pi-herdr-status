// Downstream split of Herdr's Pi integration delivery behavior.
// Derived from herdrdev/herdr src/integration/assets/pi/herdr-agent-state.ts
// at v0.9.0 (b99002ac99b09e00b4ca692436cb15a6b0d676f1); substantially modified.

import type { StateReport } from "./core.ts";

export interface SessionRef {
	agent_session_path?: string;
	agent_session_id?: string;
}

export interface ReporterSnapshot {
	disposed: boolean;
	sessionDirty: boolean;
	stateDirty: boolean;
	consecutiveFailures: number;
	currentKind?: "session" | "state";
}

export interface ReporterDependencies {
	paneId: string;
	source?: string;
	send: (request: Record<string, unknown>, timeoutMs: number, signal: AbortSignal) => Promise<boolean>;
	schedule?: (callback: () => void, delayMs: number) => () => void;
	intervals?: {
		setInterval: typeof setInterval;
		clearInterval: typeof clearInterval;
	};
	retryDelaysMs?: readonly number[];
}

const DEFAULT_RETRY_DELAYS = [750, 1_500, 3_000, 6_000, 30_000] as const;
let reportSeq = Date.now() * 1000;

function nextReportSeq(): number {
	reportSeq = Math.max(reportSeq + 1, Date.now() * 1000);
	return reportSeq;
}

function defaultSchedule(callback: () => void, delayMs: number): () => void {
	const timer = setTimeout(callback, delayMs);
	timer.unref?.();
	return () => clearTimeout(timer);
}

export class ReliableHerdrReporter {
	private readonly paneId: string;
	private readonly source: string;
	private readonly send: ReporterDependencies["send"];
	private readonly schedule: NonNullable<ReporterDependencies["schedule"]>;
	private readonly intervals: NonNullable<ReporterDependencies["intervals"]>;
	private readonly retryDelaysMs: readonly number[];
	private sessionRef: SessionRef = {};
	private sessionStartSource?: string;
	private desired?: StateReport;
	private sessionRevision = 0;
	private stateRevision = 0;
	private sessionDirty = false;
	private stateDirty = false;
	private draining = false;
	private drainPromise = Promise.resolve();
	private activeAbort?: AbortController;
	private currentKind?: "session" | "state";
	private cancelRetry?: () => void;
	private heartbeat?: ReturnType<typeof setInterval>;
	private consecutiveFailures = 0;
	private disposed = false;

	constructor(dependencies: ReporterDependencies) {
		this.paneId = dependencies.paneId;
		this.source = dependencies.source ?? "herdr:pi";
		this.send = dependencies.send;
		this.schedule = dependencies.schedule ?? defaultSchedule;
		this.intervals = dependencies.intervals ?? { setInterval, clearInterval };
		this.retryDelaysMs = dependencies.retryDelaysMs ?? DEFAULT_RETRY_DELAYS;
	}

	queueSession(sessionRef: SessionRef, sessionStartSource?: string): void {
		if (this.disposed) return;
		const changed =
			this.sessionRef.agent_session_path !== sessionRef.agent_session_path ||
			this.sessionRef.agent_session_id !== sessionRef.agent_session_id ||
			this.sessionStartSource !== sessionStartSource;
		if (!changed && !this.sessionDirty) return;
		this.sessionRef = { ...sessionRef };
		this.sessionStartSource = sessionStartSource;
		this.sessionRevision += 1;
		this.sessionDirty = true;
		if (changed && this.desired) {
			this.stateRevision += 1;
			this.stateDirty = true;
		}
		this.activeAbort?.abort();
		this.kick();
	}

	queueState(report: StateReport, force = false): void {
		if (this.disposed) return;
		const changed = this.desired?.state !== report.state || this.desired?.message !== report.message;
		if (!changed && (!force || this.stateDirty || this.currentKind === "state")) return;
		this.desired = { ...report };
		this.stateRevision += 1;
		this.stateDirty = true;
		if (changed && this.currentKind === "state") this.activeAbort?.abort();
		this.kick();
	}

	startHeartbeat(getReport: () => StateReport | undefined, intervalMs = 30_000): void {
		if (this.disposed || intervalMs <= 0 || this.heartbeat) return;
		this.heartbeat = this.intervals.setInterval(() => {
			const report = getReport();
			if (report) this.queueState(report, true);
		}, intervalMs);
		this.heartbeat.unref?.();
	}

	async flush(): Promise<void> {
		while (this.draining) await this.drainPromise;
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.cancelRetry?.();
		this.cancelRetry = undefined;
		if (this.heartbeat) this.intervals.clearInterval(this.heartbeat);
		this.heartbeat = undefined;
		this.activeAbort?.abort();
		this.activeAbort = undefined;
		this.sessionDirty = false;
		this.stateDirty = false;
	}

	snapshot(): ReporterSnapshot {
		return {
			disposed: this.disposed,
			sessionDirty: this.sessionDirty,
			stateDirty: this.stateDirty,
			consecutiveFailures: this.consecutiveFailures,
			currentKind: this.currentKind,
		};
	}

	private kick(): void {
		if (this.disposed || this.draining) return;
		this.cancelRetry?.();
		this.cancelRetry = undefined;
		this.draining = true;
		this.drainPromise = this.drain().finally(() => {
			this.draining = false;
			this.currentKind = undefined;
			this.activeAbort = undefined;
			if (!this.disposed && (this.sessionDirty || this.stateDirty) && !this.cancelRetry) this.kick();
		});
	}

	private async drain(): Promise<void> {
		while (!this.disposed && (this.sessionDirty || this.stateDirty)) {
			const kind = this.sessionDirty ? "session" : "state";
			const revision = kind === "session" ? this.sessionRevision : this.stateRevision;
			this.currentKind = kind;
			const controller = new AbortController();
			this.activeAbort = controller;
			const request = kind === "session" ? this.sessionRequest() : this.stateRequest();
			let delivered = await this.send(request, 500, controller.signal);
			if (!delivered && !controller.signal.aborted && !this.disposed) {
				delivered = await this.send(request, 1_500, controller.signal);
			}
			if (controller.signal.aborted || this.disposed) continue;
			if (delivered) {
				this.consecutiveFailures = 0;
				if (kind === "session" && revision === this.sessionRevision) this.sessionDirty = false;
				if (kind === "state" && revision === this.stateRevision) this.stateDirty = false;
				continue;
			}
			this.consecutiveFailures += 1;
			const retryIndex = Math.min(this.consecutiveFailures - 1, this.retryDelaysMs.length - 1);
			const delay = this.retryDelaysMs[retryIndex] ?? 30_000;
			this.cancelRetry = this.schedule(() => {
				this.cancelRetry = undefined;
				this.kick();
			}, delay);
			return;
		}
	}

	private sessionRequest(): Record<string, unknown> {
		return {
			method: "pane.report_agent_session",
			params: {
				pane_id: this.paneId,
				source: this.source,
				agent: "pi",
				seq: nextReportSeq(),
				session_start_source: this.sessionStartSource,
				...this.sessionRef,
			},
		};
	}

	private stateRequest(): Record<string, unknown> {
		return {
			method: "pane.report_agent",
			params: {
				pane_id: this.paneId,
				source: this.source,
				agent: "pi",
				state: this.desired?.state,
				message: this.desired?.message,
				seq: nextReportSeq(),
				...this.sessionRef,
			},
		};
	}
}
