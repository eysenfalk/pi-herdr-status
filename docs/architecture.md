# Architecture

## Single status authority

Pi Herdr Status is a standalone replacement for Herdr's bundled `herdr-agent-state.ts`. It preserves the upstream semantic source, `herdr:pi`, and owns the pane/session sequence for that source. The bundled extension must not be loaded concurrently.

The runtime has four modules:

- `index.ts` wires Pi lifecycle, native prompt, and sibling Herdr events.
- `core.ts` is the pure lifecycle reducer and precedence policy.
- `recovery.ts` serializes authoritative session/state reports, retries failed delivery, and schedules heartbeats.
- `herdr-rpc.ts` performs one bounded, abortable request over Herdr's local socket and validates the matching acknowledgement.

The fork origin and refresh procedure are in [Upstream relationship](upstream.md).

## State policy

The reducer tracks independent facts rather than converting one kind of work into another:

```text
promptActive OR blockedCount > 0
  → blocked
else agentActive OR busyCount > 0
  → working
else
  → idle
```

- `agentActive` follows `agent_start` and accepted `agent_settled` events. Settlement is accepted only when `ctx.isIdle() === true`.
- `promptActive` follows native `ui_prompt_start` / `ui_prompt_end` events and uses fixed labels selected only by prompt kind.
- `blockedCount` follows counted `herdr:blocked` sibling events, including pi-subagents attention.
- `busyCount` follows counted `herdr:busy` sibling events, including active async pi-subagents runs.

Busy and blockers cannot consume one another. Blocking always wins. When the final blocker ends, the reducer returns to working if the parent or any async busy lease remains active. Anonymous partial releases clear that event type's displayed label rather than preserving a potentially stale owner name.

## Event ordering and reload

Sibling busy/block events are accepted before `session_start` but are not published until a root TUI session is established. This makes restoration independent of whether pi-subagents or this fork handles `session_start` first.

State publication is microtask-coalesced. pi-subagents may replace a busy label by emitting `active:false` followed immediately by `active:true`; coalescing prevents a transient idle report between that balanced pair.

On `/reload`, pi-subagents reconstructs active runs from its authoritative run index and re-emits its busy lease. On shutdown this fork unsubscribes from sibling events, aborts active socket work, and cancels retry and heartbeat timers.

## Reporting and recovery

Session and state reports share one serialized writer. Session identity is reported before lifecycle state, and every request receives a monotonically increasing sequence. State updates supersede stale in-flight state writes; a changed session identity also aborts any stale state send and republishes the current state after the new session report.

Each request:

1. connects only to `HERDR_SOCKET_PATH`;
2. writes one newline-delimited JSON request;
3. accepts only a matching response ID with no error;
4. rejects malformed or oversized responses;
5. times out after 500 ms, then retries once with a 1.5 second timeout.

If both attempts fail, the latest desired state is retained and retried after 0.75, 1.5, 3, 6, then 30 seconds. A 30-second heartbeat republishes the current state even when nothing changed. Because the fork is the sole source/sequence owner, this repairs lost reports without pane reads, synthetic blocker pulses, or authority handoff.

## Deliberate limits

- `herdr:busy` and `herdr:blocked` are anonymous counted deltas. A producer that vanishes without releasing its lease can leave the count stale until the Pi session reloads or exits.
- Each event type has one current label. On an ambiguous partial release the count is preserved but the label is cleared, because the anonymous event contract cannot identify which owner remains.
- A hard-killed Pi process cannot send another heartbeat; process-exit handling remains Herdr's responsibility.
- Loading this fork beside Herdr's bundled integration creates two publishers for the same source and is unsupported.
