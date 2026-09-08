# Release-candidate evaluation

## Scope

Evaluate `@eysenfalk/pi-herdr-status@1.0.0-rc.0` as a standalone Pi package without changing Herdr's managed Pi integration, the active Pi harness, GitHub, npm, or any public channel.

## Unchanged baseline

Herdr's official Pi integration remains installed and owns semantic lifecycle state. Without this companion, native Pi blocking UI is only partially visible to Herdr and there is no companion-side read-only reconciliation for a dropped lifecycle update.

## Candidate

The package adds only:

- fixed-label native prompt bridging through the managed `herdr:blocked` event;
- expected-state tracking aligned with Pi's lifecycle and `ctx.isIdle()`;
- read-only `pane.get` reconciliation over Herdr's local socket;
- mismatch-only balanced recovery, bounded retry, cancellation, and foreign-blocker protection.

It never modifies the managed file or sends a direct lifecycle report.

## Correctness evidence

- 18 focused Node tests pass.
- Coverage includes pure prompt transitions, headless exclusion, shutdown cleanup, duplicate events, balanced blocker counts, lifecycle expectation, bounded retry, stale-read cancellation, one-read enforcement, foreign blockers, Windows endpoint normalization, exact `pane.get` extraction, oversized-response rejection, prompt-content exclusion, and a socket-backed dropped-settlement recovery through a managed-like event listener.
- The socket-backed integration test starts with observed `working` while Pi is settled and verifies the exact balanced pulse restores `done` with blocker count zero.
- `npm run check` passes lint, strict TypeScript, tests, documentation links/contracts, immutable workflow pins, and package allowlist checks.
- `npm run smoke:packed` packs the exact npm artifact, installs it in a fresh temporary Pi home, and loads it with the installed Pi bundle offline without credentials, sessions, context files, skills, prompts, or provider calls.
- The exact tarball contains 18 explicitly allowlisted files, has no runtime dependency, is 110,911 bytes unpacked, and has SHA-256 `155714ec326ef9f50d23e8f1ae027be8681217d1e4c36d88b6733b18f382a9a2`.
- A real Herdr 0.9.0 pane loaded Pi 0.85.1 with only the managed integration, candidate, and bounded prompt driver. Herdr independently observed `done → blocked → done`; `screen_detection_skipped=true` confirmed the managed lifecycle authority remained active. The sanitized commands, timeline, scope, and cleanup record are retained in [`tests/fixtures/validation-2026-09-09.md`](tests/fixtures/validation-2026-09-09.md).
- Fresh real Pi TUI sessions were inspected at 120×40 and 40×40. The native confirmation remained legible at both widths.
- Responsive gallery media are labeled faithful cropped redraws. They show only the content-free test prompt and observed status sequence; private prompts, paths, model identity, footer, and unrelated startup output are absent.

## Security and privacy evidence

- Runtime package checks forbid internet clients, subprocesses, model-message injection, direct Herdr lifecycle reporting, install hooks, runtime dependencies, and access to common prompt-content fields.
- Runtime uses `node:net` only for the local endpoint supplied by Herdr. It parses the current pane's `pane.get` response locally, returns and uses only `agent_status`, and neither retains nor emits other fields.
- CI defaults to read-only permissions; actions are pinned to full commit SHAs.
- CodeQL and protected OIDC npm publishing workflows are prepared but cannot be verified until a public repository exists.

## Cost and complexity

- Four small runtime files.
- One local `pane.get` request after lifecycle transitions and every 30 seconds; only the returned semantic status is used.
- At most one unreferenced timer and one abortable socket read.
- Failure delays: 0.75, 1.5, 3, 6, then 30 seconds.
- Zero runtime dependencies, persistence, analytics, internet requests, subprocesses, or model calls.

## Residual limits

- A stale `blocked` state is preserved because it may belong to another producer.
- A foreign blocker suppresses recovery writes until released.
- Overlapping blockers preserve the anonymous count but can temporarily share the last emitted label.
- Permanent daemon unavailability and genuinely hung active work cannot be repaired.
- Linux is the only complete platform journey; Windows pipe normalization is unit-tested, while full Windows and macOS journeys remain open compatibility work.
- Public CI, CodeQL, branch protection, social preview, npm provenance, Pi gallery rendering, and clean npm install remain unverified until separately approved publication steps occur.

## Decision

The local package candidate is suitable for independent final review. Repository creation, package publication, active-harness promotion, and external announcement remain disabled until explicit owner decisions.
