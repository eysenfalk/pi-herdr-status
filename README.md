<div align="center">

# Pi Herdr Status

**Make Herdr tell the truth about what Pi is doing.**

An update-safe status companion for [Pi](https://github.com/badlogic/pi-mono) inside [Herdr](https://herdr.dev/).

[![release candidate](https://img.shields.io/badge/status-release_candidate-c4b5fd?style=flat-square)](CHANGELOG.md)
[![MIT license](https://img.shields.io/badge/license-MIT-86efac?style=flat-square)](LICENSE)
[![Pi package](https://img.shields.io/badge/Pi-package-67e8f9?style=flat-square)](https://pi.dev/packages)
[![runtime dependencies](https://img.shields.io/badge/runtime_dependencies-0-93c5fd?style=flat-square)](docs/privacy-security.md)

</div>

Pi Herdr Status makes native Pi prompts show as **blocked** and repairs dropped lifecycle updates that can otherwise leave a finished pane stuck on **working**.

> [!IMPORTANT]
> This repository contains the reviewed `1.0.0` release candidate. GitHub creation and npm publication remain separately gated; the npm install command below becomes available only after publication.

<picture>
  <source media="(max-width: 700px)" srcset="media/gallery-mobile.webp" width="800" height="640">
  <img src="media/gallery.webp" alt="Sanitized lifecycle proof: a content-free native Pi confirmation is independently observed by Herdr as done, then blocked, then done; private prompts, paths, model identity, and footer are absent" width="960" height="480">
</picture>

_Faithful cropped redraws from real Pi 0.85.1 and Herdr 0.9.0 sessions at desktop and narrow widths. A content-free test prompt is shown; private prompts, paths, model identity, footer, and unrelated startup output are absent._

## Why it exists

Herdr already owns Pi's semantic lifecycle integration. This package does not replace it. It fills two narrow gaps without modifying Herdr's managed file:

- Pi's native `select`, `confirm`, `input`, `editor`, and custom UI prompts become visible as `blocked`.
- A local, read-only heartbeat detects a confirmed stale nonblocked status and asks the official integration to resend its current state.

The result is a more trustworthy Herdr sidebar while Herdr remains the single status authority.

## Install

### 1. Install Herdr's official Pi integration

```bash
herdr integration install pi
```

### 2. Install the companion

After stable publication:

```bash
pi install npm:@eysenfalk/pi-herdr-status
```

For the reviewed release candidate, pin either published source exactly:

```bash
pi install npm:@eysenfalk/pi-herdr-status@1.0.0-rc.0
pi install git:github.com/eysenfalk/pi-herdr-status@v1.0.0-rc.0
```

Until either prerelease exists, use a local checkout. Then run `/reload` in existing Pi sessions or start a fresh Pi session inside Herdr. GitHub and npm publication are intentionally separate from repository preparation.

## What changes

| Pi state | Herdr status |
| --- | --- |
| Agent is generating or running tools | `working` |
| Native Pi prompt is awaiting you | `blocked` |
| Agent has settled | `done` / `idle` |
| Final lifecycle report was dropped | Reconciled through the official integration |

No commands, tools, keybindings, model messages, or settings are added.

## How it stays safe

```text
Pi lifecycle events ──► companion expectation
                              │
                              ├─ native prompt ──► herdr:blocked
                              │
Herdr local socket ── pane.get status
                              │
                    mismatch only
                              ▼
                    balanced blocked pulse
                              │
                              ▼
                    official Herdr integration
                    resends authoritative state
```

The companion never calls Herdr's semantic reporting methods directly. It requests and parses the current pane's local `pane.get` response, returns and uses only `agent_status`, and emits balanced events through the API that the official integration already owns.

- No analytics, telemetry, subprocesses, persistence, or model calls.
- No prompt titles, prompt contents, transcripts, paths, or tool data leave Pi.
- No runtime dependencies or install hooks.
- One abortable local-socket read and one unreferenced timer at most.
- Automatic backoff during socket failures.

Read [Architecture](docs/architecture.md) and [Privacy and security](docs/privacy-security.md) for the exact contract.

## Requirements and compatibility

- Node.js 22 or newer
- Pi coding agent with `ui_prompt_start` / `ui_prompt_end` lifecycle events
- Herdr running around the Pi pane
- Herdr's official Pi integration installed

The release candidate is validated against **Pi 0.85.1** and **Herdr 0.9.0** on Linux. The local socket path is normalized for Windows, but a complete Windows Herdr journey is not yet claimed. See [Compatibility](docs/compatibility.md).

## Troubleshooting

Start with:

```bash
herdr status
herdr integration install pi
```

Then start Pi inside a Herdr pane and run `/reload`. If the status is still wrong, see [Troubleshooting](docs/troubleshooting.md) before opening an issue.

## Development

```bash
git clone https://github.com/eysenfalk/pi-herdr-status.git
cd pi-herdr-status
npm ci --ignore-scripts
npm run check
npm run smoke:packed
```

For real Herdr/Pi checks and faithful gallery capture, follow [Development and TUI validation](docs/development-workflow.md).

## Scope

Pi Herdr Status is deliberately not a Herdr orchestrator, delegation tool, process manager, or replacement integration. It owns one thing: making the official Pi lifecycle status more complete and resilient.

Herdr and Pi are independent projects. This community package is not affiliated with or endorsed by either project.

## License

[MIT](LICENSE)
