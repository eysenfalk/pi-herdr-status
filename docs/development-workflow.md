# Development and TUI validation

## Deterministic checks

```bash
npm ci --ignore-scripts
npm run check
npm run smoke:packed
```

`npm run smoke:packed` builds the exact npm artifact, installs it into a fresh temporary Pi home, starts the installed Pi bundle offline in RPC mode, verifies extension loading, and removes the temporary home.

## Upstream review

Before changing lifecycle, transport, session identity, or schema behavior, follow [Upstream relationship](upstream.md). Compare the current Herdr source with the recorded baseline and preserve Apache-2.0 notices. Do not copy the monorepo file over the fork without classifying and reapplying downstream changes.

## Real Herdr/Pi journey

Use a disposable Herdr workspace and load only:

1. the exact packed Pi Herdr Status artifact;
2. pi-subagents when testing async busy/attention;
3. a bounded content-free driver when a native prompt or deterministic child duration is required.

Herdr's bundled `herdr-agent-state.ts` must be absent. A journey with both reporters is invalid evidence.

Verify semantic status independently from another pane:

```text
startup/reload      idle or current parent state
normal turn         idle → working → idle
async child         idle → working; remains working after parent settles
busy overlap        working until the final async lease releases
native prompt       idle/working → blocked → idle/working
attention + busy    working → blocked → working
Escape abort        working → idle unless async work remains
heartbeat/reconnect lost report is reasserted within the bounded window
```

Test reload with active async work in both effective handler orders. Verify `pane.agent_status`, not metadata labels or terminal text alone. Record the exact package artifact, versions, authority explanation, timeline, and cleanup.

## Responsive TUI capture

Capture fresh real Pi sessions at:

- `ptyCols: 120`, `ptyRows: 40`
- `ptyCols: 40`, `ptyRows: 40`

Set `PI_TUI_WRITE_LOG` under `.artifacts/`; retain raw `*.ansi` only locally. Sanitize prompt text, paths, model identifiers, footer data, and unrelated extension output before creating committed fixtures.

Committed SVGs must be faithful transcript redraws of reviewed fixtures, explicitly labeled as such. Generate WebP gallery files from those SVGs; no automated ANSI replay is accepted as proof of line-for-line fidelity.

## Release evidence

A release candidate requires:

- deterministic checks and coverage;
- upstream provenance and license review;
- exact packed-package inspection and offline Pi load;
- real Herdr/Pi parent, async, prompt, reload, abort, and recovery journeys;
- wide and narrow visual review;
- comparison with Herdr's unchanged bundled integration and the retired companion design;
- independent correctness/security and documentation/provenance/release review.
