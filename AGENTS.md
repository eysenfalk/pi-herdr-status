# Pi Herdr Status contributor guidance

Keep this package a narrow, update-safe companion to Herdr's managed Pi integration.

- Never modify or vendor Herdr's managed `herdr-agent-state.ts`.
- Never call Herdr semantic report methods or establish another source/sequence owner.
- Never inspect or emit prompt contents, transcripts, tools, paths, credentials, or provider data.
- Keep runtime dependencies, install hooks, analytics, internet calls, subprocesses, persistence, and model calls out.
- Put deterministic policy in pure modules and keep Pi/Herdr adapters thin.
- Add focused regression tests for blocker balance, overlap, cancellation, shutdown, socket failure, and lifecycle races.
- Run `npm run check`, `npm run smoke:packed`, and the applicable real Herdr/Pi journey before claiming compatibility.
- Repository creation, publication, promotion, and releases require explicit owner approval.
