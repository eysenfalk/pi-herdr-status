# Upstream relationship

Pi Herdr Status is an extracted, standalone downstream fork of the Pi integration bundled with [Herdr](https://github.com/herdrdev/herdr). It is not a GitHub network fork because the upstream integration is one file inside a larger Rust monorepo.

## Fork baseline

| Field | Value |
| --- | --- |
| Upstream repository | `https://github.com/herdrdev/herdr` |
| Upstream path | `src/integration/assets/pi/herdr-agent-state.ts` |
| Upstream commit | `b9ce14fb9970dbebcff52a620e4247b88265678a` |
| Upstream integration marker | `HERDR_INTEGRATION_VERSION=8` |
| Upstream license | Apache-2.0 |

The baseline was captured on 2026-09-09. The modified runtime file carries a prominent derivation notice, and [`NOTICE`](../NOTICE) records the same provenance in the distributed package.

## Downstream changes

The fork preserves upstream pane/session identity, `herdr:pi` source ownership, monotonic sequence semantics, TUI gating, lifecycle hooks, and local-socket transport. It adds:

- native `ui_prompt_start` / `ui_prompt_end` handling with fixed, content-free labels;
- counted `herdr:busy` leases so settled parents remain `working` while async subagents run;
- blocker-over-busy precedence;
- acknowledgement-aware socket responses, bounded retries, cancellation, and 64 KiB response limits;
- a 30-second authoritative state heartbeat that repairs dropped reports without a second status source;
- deterministic pure lifecycle and transport tests.

## Upstream refresh procedure

1. Fetch the current upstream `herdr-agent-state.ts`, its tests, license, and integration documentation.
2. Record the exact upstream commit and compare the file against the baseline above.
3. Classify every upstream change as transport, lifecycle, session identity, schema, compatibility, or documentation.
4. Port applicable changes into this fork rather than replacing the forked file wholesale.
5. Update the baseline commit and change summary in this document and `NOTICE`.
6. Run the complete deterministic suite, exact packed-Pi smoke, and real Herdr/Pi journeys including async subagents, prompts, reload, abort, and heartbeat recovery.
7. Obtain independent correctness/security and provenance/release review before merging.

Do not run `herdr integration update pi` as an update mechanism for this package. That command manages Herdr's bundled integration and can recreate the competing managed file.
