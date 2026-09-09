# Release-candidate evaluation

## Scope

Evaluate `@eysenfalk/pi-herdr-status@1.0.0-rc.0` as a standalone downstream fork of Herdr's bundled Pi integration. GitHub creation, npm publication, active-harness installation, and external announcement remain disabled.

## Compared designs

### Herdr 0.9.0 bundled integration

The unchanged upstream v8 hook is the semantic lifecycle authority and correctly handles parent `agent_start` / settled state plus `herdr:blocked`. It does not consume `herdr:busy`, native prompt events, or periodically reassert delivered state. A settled parent therefore becomes idle while async pi-subagents work remains active.

### Retired companion design

The previous candidate kept the bundled hook installed, bridged native prompts through `herdr:blocked`, and used read-only `pane.get` reconciliation plus balanced pulses for dropped terminal reports. It preserved upstream authority but could not make async work semantically `working`: the official reducer had no busy input, so every pulse recomputed idle.

### Standalone fork candidate

The fork removes that reachability limit while retaining one source/sequence owner. Its reducer is:

```text
blocked > (parentActive || busyCount > 0) > idle
```

It directly handles native prompts and sibling busy/block leases, serializes session/state reports, validates acknowledgements, retries failures, supersedes stale writes, and republishes authoritative state every 30 seconds. The bundled integration must be absent.

## Provenance

- Upstream repository: `https://github.com/herdrdev/herdr`
- Upstream path: `src/integration/assets/pi/herdr-agent-state.ts`
- Baseline release: `v0.9.0`
- Baseline commit: `b99002ac99b09e00b4ca692436cb15a6b0d676f1`
- Baseline marker: `HERDR_INTEGRATION_VERSION=8`
- License: Apache-2.0

The upstream integration's behavior is split across four downstream runtime files; each carries the exact baseline and a prominent substantial-modification notice. Exact provenance and the refresh procedure are distributed in `NOTICE` and `docs/upstream.md`.

## Deterministic evidence

- 19 focused tests pass.
- Strict TypeScript, Biome, documentation, workflow, and package-allowlist checks pass.
- Coverage includes parent lifecycle, accepted settlement, one and multiple busy/block leases, ambiguous-label clearing, both reload event orders, prompt/block precedence, fixed prompt labels, malformed/headless exclusion, label sanitization, session-before-state ordering, session-switch races, sequence monotonicity, failure retry/backoff, stale-send cancellation, shutdown cancellation, heartbeat, RPC acknowledgement/error/size handling, and socket-backed async settlement/relabel behavior.
- Exact packed-artifact Pi smoke passed offline in a fresh temporary home.

## Real target-environment evidence

With Herdr 0.9.0, Pi 0.85.1, and pi-subagents 0.66.0, disposable workspaces loaded the exact packed artifact as the only `herdr:pi` authority. Independent `herdr agent get` observations verified:

- startup `idle` with `screen_detection_skipped=true`;
- real async success and failure terminal paths stay `working` after the parent settles, then return idle;
- a real two-child workflow remains `working` until both lanes reach terminal state;
- a real child `contact_supervisor` request produces `working → blocked → working → done`;
- forward and reversed extension registration orders, including reload during active async work;
- real async + native prompt precedence: `working → blocked → working → done`;
- native prompt `idle → blocked → done`;
- Escape abort `done → working → done`;
- a relay-observed heartbeat `pane.report_agent` 29,884 ms after the initial settled report, without flicker;
- real Herdr socket outage followed by bounded retry after reconnect: stale `idle → working → done`.

The sanitized record is `tests/fixtures/validation-2026-09-09.md`. All disposable workspaces, raw captures, relays, and child runs were terminated or removed.

## Reviewed artifact

```text
filename: eysenfalk-pi-herdr-status-1.0.0-rc.0.tgz
files: 20 explicitly allowlisted
unpacked bytes: 150314
sha256: e8ca6d50031d5b6715ed82a640f6692456642d6727c890381456b6fdeea74038
```

The validation record and this evaluation are intentionally excluded from the npm artifact, so recording the hash does not create a self-referential package.

## Review findings and corrections

The first three-lane independent review blocked the candidate on two runtime defects and stale evidence:

1. a session change could race an in-flight state report;
2. anonymous partial releases could retain a stale owner label;
3. install/rollback instructions could create a no-authority or dual-authority window;
4. the retained evidence still described the retired companion.

The implementation now aborts stale state sends on session changes and republishes after the new session report; partial releases preserve counts but clear ambiguous labels; install/rollback stages and verifies one authority before reload; and all retained evidence was regenerated for the fork. Regression tests cover both runtime findings.

A later npm-readiness audit found that the recorded upstream commit did not exist and that only the entrypoint carried a per-file modification notice. The baseline is now pinned to Herdr `v0.9.0` commit `b99002ac99b09e00b4ca692436cb15a6b0d676f1`; all four derivative runtime files carry prominent notices, and the documentation contract enforces both facts.

Independent runtime/code, documentation/provenance, retained real-environment, licensing, and final package reviews now approve the release candidate with no remaining findings. Focused closure reviews confirmed the staged compatibility handoff, real overlap, attention, observable-heartbeat evidence, Apache-2.0 redistribution notices, and final artifact consistency.

## Cost and complexity

- Four runtime files and zero runtime dependencies.
- One local state write per lifecycle change plus one every 30 seconds.
- At most one active request, one retry timer, and one heartbeat timer.
- No pane reads, subprocesses, persistence, internet access, analytics, or model calls.

## Rollback

Remove the exact Pi package source and verify it is absent, then run `herdr integration install pi` and reload or restart Pi. Never load both integrations concurrently.

## Residual limits

- Anonymous busy/block deltas cannot recover a producer that disappears without release; reload or process exit is required.
- On an ambiguous partial release the count remains authoritative but the owner label is cleared.
- A hard-killed Pi process cannot emit retry or heartbeat traffic.
- Runtime cannot prevent a user from manually co-installing two `herdr:pi` authorities; installation safety is procedural and documented.
- Windows pipe normalization is unit-tested; complete Windows and macOS journeys remain unverified.
- Public CI, branch protection, CodeQL, provenance publishing, clean remote installation, and rollback remain gated on repository creation.

## Decision

The implementation, local validation, and independent review gates pass. Promotion remains disabled until the owner explicitly approves; repository creation, active installation, and npm publication are separate gates.
