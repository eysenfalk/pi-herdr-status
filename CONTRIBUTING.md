# Contributing

Thank you for helping keep Pi's Herdr status accurate and trustworthy.

## Before coding

- Search existing issues.
- Keep Herdr's managed integration as the sole lifecycle authority.
- Prefer the smallest root-cause change and deterministic tests.
- Never add prompt capture, transcript access, analytics, model calls, or a competing semantic reporter.

Small documentation and regression-test corrections can go directly to a pull request. Behavior changes should start with a focused issue.

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

- Keep Pi/Herdr wiring in `index.ts` and socket I/O in `herdr-rpc.ts`.
- Keep prompt and recovery policy deterministic and independently tested.
- Preserve balanced blocker counts and cancellation guarantees.
- Add focused tests for success, failure, overlap, cancellation, and lifecycle edges.
- Update compatibility and privacy docs when interfaces or data flow change.

## Pull requests

Include the intended invariant, smallest root-cause change, applicable test output, packed smoke evidence, compatibility/privacy impact, and residual risks. Use clear imperative commits; Conventional Commit prefixes are welcome.

Maintainers control versions, tags, releases, and npm publication. Pull requests must not add credentials or bypass release gates.
