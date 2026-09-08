# Troubleshooting

## Herdr never shows Pi status

1. Confirm Herdr is running: `herdr status`.
2. Reinstall the official integration: `herdr integration install pi`.
3. Start Pi from a Herdr-managed pane.
4. Run `/reload` or start a fresh Pi process.

The companion is intentionally inactive outside a Herdr TUI pane.

## Prompts do not show as blocked

Confirm your Pi version exposes native UI prompt lifecycle events. Reproduce with a built-in or trusted extension prompt, not a provider/tool that is merely slow. Include Pi and Herdr versions in a bug report, but never include the prompt content.

## A pane remains working

Wait through the bounded retry window, then inspect Herdr's own explanation output. A genuinely active or hung Pi turn remains `working` by design; the companion does not guess whether active work is useful.

## A blocked label is unexpected

Herdr's managed API uses an anonymous blocker count and one last-writer label. Overlapping blockers preserve the count but may temporarily share the most recent label. See [Architecture](architecture.md#deliberate-limits).

## Reporting a useful bug

Include:

- Pi, Herdr, package, Node.js, and operating-system versions;
- whether Pi was launched inside Herdr;
- expected and observed status transitions;
- whether `/reload` in a fresh session reproduces it;
- a minimal content-free timeline.

Do not attach credentials, prompts, transcripts, session files, or raw socket traffic.
