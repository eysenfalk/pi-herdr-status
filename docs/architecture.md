# Architecture

## Ownership boundary

Herdr's managed `herdr-agent-state.ts` remains the sole semantic lifecycle reporter. It owns pane/session identity, source and sequence values, the outgoing report queue, and the shared blocked reference count. Pi Herdr Status neither modifies nor replaces that file.

The package has four small modules:

- `index.ts` wires Pi and Herdr events.
- `core.ts` is the pure native-prompt state machine.
- `recovery.ts` tracks the expected lifecycle and schedules bounded reconciliation.
- `herdr-rpc.ts` performs one abortable `pane.get` request over Herdr's local socket, parses the response locally, and returns only `agent_status`.

## Prompt bridge

A TUI `ui_prompt_start` event emits one fixed-label `{active: true}` event. The matching `ui_prompt_end` emits `{active: false}`. Duplicate starts and ends are ignored, shutdown closes an open span, and non-TUI sessions emit nothing.

Only the prompt kind selects the fixed label. Prompt titles and values are not inspected or forwarded.

## Recovery

After an authoritative lifecycle transition and then every 30 seconds, the companion reads only:

```text
pane.get.result.pane.agent_status
```

A matching state causes no write. `blocked` is preserved when another producer may own it. A confirmed nonblocked mismatch triggers a balanced pulse through `herdr:blocked`:

- expected `working` or settled: `active:true`, then `active:false`;
- expected `blocked`: `active:false`, then `active:true`.

The official integration processes that pulse and resends its own current semantic state. The companion never creates a parallel source or sequence.

## Concurrency and failure behavior

- At most one timer and one socket read exist at a time.
- Every lifecycle transition cancels stale work.
- Shutdown aborts the active read and clears local state.
- Socket failures back off at 0.75, 1.5, 3, 6, then 30 seconds.
- Foreign `herdr:blocked` events are counted locally. Any active foreign blocker suppresses recovery writes.

## Deliberate limits

The shared blocker API is an anonymous count with one current label. A native prompt overlapping another producer preserves the count but can replace that producer's displayed label until it reports again. Fixing that exactly requires blocker identities in the managed protocol and is outside this package's authority.

A stale server-side `blocked` status is preserved because it cannot be distinguished safely from a legitimate independent blocker. A permanently unavailable daemon or a genuinely hung active agent also cannot be repaired by this companion.
