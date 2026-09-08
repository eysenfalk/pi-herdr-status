# Compatibility

## Validated matrix

| Component | Validated version | Evidence |
| --- | --- | --- |
| Pi coding agent | 0.85.1 | Unit/type checks, packed offline load, real TUI journey |
| Herdr | 0.9.0 | Real isolated lifecycle and prompt journeys |
| Node.js | 22 | Local and CI contract |
| Platform | Linux | Full journey |

CI also targets Node.js 24.

## Required interfaces

Pi Herdr Status depends on:

- Pi extension events `session_start`, `agent_start`, `agent_settled`, `ui_prompt_start`, `ui_prompt_end`, and `session_shutdown`;
- `ctx.mode` and `ctx.isIdle()`;
- the shared `pi.events` event bus;
- Herdr environment variables `HERDR_ENV`, `HERDR_SOCKET_PATH`, and `HERDR_PANE_ID`;
- Herdr's `pane.get` socket method and managed `herdr:blocked` listener.

If any of these interfaces changes, the package must fail conservatively rather than becoming a second lifecycle reporter.

## Platforms

Unix-domain sockets are exercised on Linux. Windows named-pipe normalization is unit-tested, but a full Windows Herdr/Pi journey remains unverified. macOS uses the same Unix-socket path shape but is not yet in the validated matrix.

## Version policy

Compatibility claims are evidence-based, not open-ended. New Pi or Herdr versions are added only after the focused suite, packed package smoke test, and real TUI journey pass.
