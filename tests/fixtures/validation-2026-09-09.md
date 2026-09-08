# Sanitized release-candidate validation record

Date: 2026-09-09

Platform: Linux

Candidate: `@eysenfalk/pi-herdr-status@1.0.0-rc.0`

This record intentionally omits local paths, model identity, footer data, credentials, session identifiers, terminal IDs, and private content.

## Versions

```text
Pi: 0.85.1
Herdr client/server: 0.9.0
Herdr protocol: 22
Node.js: 22.x
```

## Exact-artifact checks

```text
npm run check
  18 tests passed; lint, strict TypeScript, docs, workflow, and package contracts passed

npm run smoke:packed
  package: eysenfalk-pi-herdr-status-1.0.0-rc.0.tgz
  scope: temporary HOME; offline; no credentials, sessions, skills,
         prompts, context files, or provider calls
  stateLoaded: true
  loaderError: false
  timedOut: false

exact tarball:
  filename: eysenfalk-pi-herdr-status-1.0.0-rc.0.tgz
  files: 18 explicitly allowlisted
  unpacked bytes: 110911
  sha256: 155714ec326ef9f50d23e8f1ae027be8681217d1e4c36d88b6733b18f382a9a2
```

## Real Herdr/Pi prompt journey

A disposable Herdr workspace launched a fresh visible Pi process with exactly:

1. Herdr's installed managed Pi integration;
2. `extensions/pi-herdr-status/index.ts` from this candidate;
3. a bounded local test driver registering `/status-demo`.

The test driver opened Pi's native content-free confirmation:

```text
Status demo
Continue?

→ Yes
  No
```

An independent `herdr agent get` observation produced this content-free timeline:

```text
before command: done
prompt visible: blocked
screen_detection_skipped: true
after Enter: done
```

`screen_detection_skipped=true` demonstrates that Herdr continued to use full managed lifecycle-hook authority; the companion did not fall back to screen detection or become a second reporter.

## Responsive Pi TUI journey

Fresh no-provider Pi processes loaded only the candidate and prompt driver in real PTYs:

```text
120 columns × 40 rows: confirmation legible
 40 columns × 40 rows: confirmation legible and help wrapped intentionally
```

Sanitized excerpts are retained as `real-pi-120.txt` and `real-pi-40.txt`. `media/demo.svg` and `media/demo-mobile.svg` are cropped redraws of those excerpts plus the independently observed Herdr state sequence.

## Recovery fault test

The deterministic integration test exposes a local `pane.get` socket returning stale `working` while Pi's authoritative expectation is settled. A managed-like `herdr:blocked` listener receives the companion pulse. The observed result is:

```text
initial semantic state: working
recovery events: active:true → active:false
final semantic state: done
final blocked count: 0
```

This retained test exercises the exact package event and socket adapters without a provider call. It deliberately does not claim to model every detail of Herdr's internal asynchronous queue.

## Cleanup

Both direct PTY processes were terminated after capture, the disposable Herdr workspace was closed, and the temporary test home and raw ANSI files were removed. No server, agent, or capture process was left running.
