# Pi Herdr Status contributor guidance

Keep this repository a narrow standalone downstream fork of Herdr's bundled Pi lifecycle integration.

- Preserve one semantic source/sequence authority: `herdr:pi`.
- Never support co-installation with Herdr's bundled `herdr-agent-state.ts`.
- Preserve and update `NOTICE`, Apache-2.0 licensing, the exact upstream baseline, and prominent modification notices.
- Treat `blocked`, parent activity, and async busy as independent facts with precedence `blocked > (parentActive || busy) > idle`.
- Never inspect or emit prompt contents, transcripts, tools, credentials, provider data, or unrelated environment values.
- Keep runtime dependencies, install hooks, analytics, internet calls, subprocesses, and persistence out.
- Put policy in pure modules and keep Pi/Herdr adapters thin.
- Add focused regression tests for counts, overlap, event ordering, relabel coalescing, reload, cancellation, shutdown, socket failure, and lifecycle races.
- Run `npm run check`, `npm run smoke:packed`, and the real Herdr/Pi parent/async/prompt journey before claiming compatibility.
- Repository creation, publication, active installation, promotion, and releases require explicit owner approval.
