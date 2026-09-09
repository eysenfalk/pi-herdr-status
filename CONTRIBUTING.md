# Contributing

Thank you for helping keep Pi's Herdr status accurate and trustworthy.

## Before coding

- Search existing issues.
- Read [Upstream relationship](docs/upstream.md) and preserve provenance.
- Keep `herdr:pi` as one source/sequence authority.
- Prefer the smallest root-cause change and deterministic tests.
- Never add prompt capture, transcript access, analytics, model calls, or a second semantic reporter.

Small documentation and regression-test corrections can go directly to a pull request. Behavior and upstream-sync changes should start with a focused issue.

## Setup

```bash
git clone https://github.com/eysenfalk/pi-herdr-status.git
cd pi-herdr-status
npm ci --ignore-scripts
npm run check
npm run smoke:packed
```

Node.js 22 or newer is required. Follow [Development and TUI validation](docs/development-workflow.md) for user-visible or lifecycle changes.

## Engineering standards

- Keep Pi/event wiring in `index.ts`, pure lifecycle policy in `core.ts`, reliable reporting in `recovery.ts`, and socket I/O in `herdr-rpc.ts`.
- Preserve `blocked > (parentActive || busy) > idle`.
- Preserve counted busy and blocker leases, event-order independence, microtask coalescing, and cancellation guarantees.
- Add tests for success, failure, overlap, reload, cancellation, and lifecycle edges.
- Update compatibility, privacy, upstream, and migration docs when interfaces or data flow change.
- Never validate with this fork and Herdr's bundled integration loaded together.

## Pull requests

Include the intended invariant, smallest root-cause change, upstream impact, applicable test output, packed smoke evidence, compatibility/privacy impact, and residual risks. Use clear imperative commits; Conventional Commit prefixes are welcome.

Maintainers control versions, tags, releases, and npm publication. Pull requests must not add credentials or bypass release gates.
