# Sanitized release-candidate validation record

Date: 2026-09-09

Platform: Linux

Candidate: `@eysenfalk/pi-herdr-status@1.0.0-rc.0`

This record intentionally omits local paths, model identity, footer data, credentials, prompts, session identifiers, terminal IDs, and private content.

## Versions

```text
Pi: 0.85.1
Herdr client/server: 0.9.0
Herdr protocol: 22
pi-subagents: 0.66.0
Node.js: 22.x and 24.x validation lanes
```

## Authority isolation

Every retained journey loaded the exact packed fork as the only `herdr:pi` lifecycle authority. Herdr's bundled `herdr-agent-state.ts` and the retired companion were absent. Independent `herdr agent get` responses reported:

```text
source: herdr:pi
screen_detection_skipped: true
```

The content-free driver loaded beside the package only opened a native prompt or emitted balanced public `herdr:busy` events; it never reported pane state.

## Deterministic and artifact checks

```text
npm run check
  19 tests passed; lint, strict TypeScript, docs, workflow,
  and 20-path package allowlist passed

npm run smoke:packed
  exact artifact installed into a fresh temporary Pi home offline
  stateLoaded: true; loaderError: false; timedOut: false

exact tarball
  filename: eysenfalk-pi-herdr-status-1.0.0-rc.0.tgz
  files: 20 explicitly allowlisted
  unpacked bytes: 150314
  sha256: e8ca6d50031d5b6715ed82a640f6692456642d6727c890381456b6fdeea74038
```

The focused suite covers parent lifecycle, accepted settlement, single and overlapping busy/block leases, ambiguous-label clearing, both reload event orders, prompts, malformed/headless events, label sanitation, session-before-state ordering, session-switch races, monotonically increasing sequences, retry/backoff, stale-send cancellation, shutdown cancellation, heartbeat, RPC acknowledgement/error/size handling, and socket-backed async settlement/relabel behavior.

## Real async pi-subagents journeys

The final packed artifact was loaded both before and after pi-subagents to exercise both effective registration orders. Real async `worker-luna` runs used bounded content-free sleep tasks with acceptance disabled for the success paths.

Independent semantic observations showed:

```text
before launch: idle
parent generating: working
parent settled, child visibly active: working
child complete: done / idle
```

A separate real child ended through the failed terminal path; the final busy release still returned Herdr to idle. A real two-lane async workflow showed two active children while Herdr remained `working`, followed by `done` only after both lanes reached terminal state.

A child then called its real `contact_supervisor` tool with `reason=need_decision`. Independent status and visible Pi evidence showed:

```text
child active: working
supervisor request pending: blocked
request acknowledged while child remained active: working
child complete: done
```

With a real child active, a native Pi confirmation independently produced `working → blocked → working → done`. Reloading while a real child remained active preserved `working` in both tested extension orders and returned to `done` only after child completion. Metadata labels accompanied these states but were not used as proof; `pane.agent_status` was checked independently.

## Parent, prompt, abort, and heartbeat journeys

Against the final packed artifact:

```text
startup: idle
native confirmation: idle → blocked → done
normal model/tool turn aborted with Escape: done → working → done
31-second settled heartbeat observation: done throughout; no state flicker
```

A tracked socket relay recorded the initial `pane.report_agent` and another state report 29,884 ms later while Pi remained settled. This directly confirms heartbeat delivery, not merely unchanged semantic status.

## Socket outage and reconnect journey

A tracked local Unix-socket relay sat between the final artifact and the real Herdr 0.9.0 daemon. The reporter first established authoritative idle state. The relay was then stopped and a busy lease acquired:

```text
before outage: done
while socket unavailable: idle remained (new report could not arrive)
after relay restart and bounded retry: working
final busy release: done
```

This exercised current `pane.report_agent` retry behavior against real Herdr, not the retired companion's `pane.get` recovery path. The relay was explicitly terminated after the test.

## Responsive evidence

The committed 120- and 40-column fixtures are sanitized excerpts from the visible Pi async-subagent presentation observed during the real journeys. `media/demo.svg` and `media/demo-mobile.svg` are faithful cropped redraws of those excerpts plus the independently observed Herdr timeline. The WebP gallery files were regenerated from the reviewed SVG sources.

## Cleanup

All disposable Herdr workspaces were closed, tracked relay processes were killed, temporary package homes and raw ANSI logs were removed, and no test child remained active.
