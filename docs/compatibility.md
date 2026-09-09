# Compatibility

## Candidate matrix

| Component | Target version | Current evidence |
| --- | --- | --- |
| Pi coding agent | 0.85.1 | 19-test suite; exact packed offline load; real lifecycle journeys |
| Herdr | 0.9.0 | Upstream v8 schema inspected; sole-authority prompt, abort, retry, and heartbeat journeys |
| pi-subagents | 0.66.0 | Real async success/failure, parent settlement, active reload, and prompt-precedence journeys |
| Node.js | 22 | Package target and deterministic suite |
| Platform | Linux | Full local release-candidate journey |

CI also targets Node.js 24 once the public repository exists. Claims move from target to validated only after the evidence is recorded in [`EVALUATION.md`](../EVALUATION.md).

## Required interfaces

Pi Herdr Status depends on:

- Pi events `session_start`, `agent_start`, `agent_settled`, `ui_prompt_start`, `ui_prompt_end`, and `session_shutdown`;
- `ctx.mode`, `ctx.isIdle()`, and session-manager identity accessors;
- the shared `pi.events` bus with counted `herdr:busy` and `herdr:blocked` payloads;
- Herdr environment variables `HERDR_ENV`, `HERDR_SOCKET_PATH`, and `HERDR_PANE_ID`;
- Herdr socket methods `pane.report_agent` and `pane.report_agent_session` with source/sequence handling.

`herdr:busy` is optional in the sense that Pi works normally without a producer, but async work can be held semantically working only when the producer emits balanced events. pi-subagents 0.66.0 supplies that contract.

## Co-installation

Herdr's bundled Pi extension and this fork both use source `herdr:pi`. They must not be loaded together. Stage this package without reloading, remove and verify the bundled integration, then reload with exactly one authority. During rollback, remove and verify this package before reinstalling Herdr's hook.

## Platforms

Unix-domain socket behavior is exercised on Linux. Windows named-pipe normalization is unit-tested, but a complete Windows Herdr/Pi journey is unverified. macOS uses the Unix socket shape but is not yet in the validated matrix.

## Version policy

Upstream and compatibility claims are evidence-based, not open-ended. New Pi, Herdr, or pi-subagents versions require source-contract review, the deterministic suite, exact packed-Pi smoke, and real lifecycle journeys covering async work, prompts, reload, abort, and recovery.
