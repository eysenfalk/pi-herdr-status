# Development and TUI validation

## Deterministic checks

```bash
npm ci --ignore-scripts
npm run check
npm run smoke:packed
```

`npm run smoke:packed` builds the exact npm artifact, installs it into a fresh temporary Pi home, starts the installed Pi bundle offline in RPC mode, verifies extension loading, and removes the temporary home.

## Real Herdr/Pi journey

Use a disposable Herdr workspace and load only:

1. Herdr's managed Pi integration;
2. the packed or checked-out Pi Herdr Status extension;
3. a bounded test driver when a native prompt is required.

Do not modify Herdr's managed extension. Do not reuse a credential-bearing test home when the journey does not need a provider.

Verify these transitions independently from another pane:

```text
startup/reload  managed authority remains intact
normal turn     done → working → done
native prompt   done/working → blocked → done/working
Escape abort    working → done
heartbeat       matching state remains stable for at least 33 seconds
```

Record Herdr's status authority explanation and confirm it continues to identify the managed lifecycle integration.

## Responsive TUI capture

Capture a fresh, real Pi session at both widths:

- `ptyCols: 120`, `ptyRows: 40`
- `ptyCols: 40`, `ptyRows: 40`

Set `PI_TUI_WRITE_LOG` to a file under `.artifacts/` and retain raw `*.ansi` only locally. Sanitize prompt text, paths, model identifiers, footer data, and unrelated extension output before creating a committed fixture.

The committed `media/demo.svg` and `media/demo-mobile.svg` must be faithful transcript redraws of those sanitized captures. They are not screenshots and must be labeled accordingly. Generate `gallery.webp` and `gallery-mobile.webp` from those reviewed SVGs; no automated ANSI replay is trusted as proof of line-for-line SVG fidelity.

## Release evidence

A release candidate requires:

- deterministic checks and coverage;
- exact packed-package inspection;
- packed offline Pi load;
- a real Herdr/Pi lifecycle journey;
- wide and narrow visual review;
- independent correctness/security and documentation/release review.
