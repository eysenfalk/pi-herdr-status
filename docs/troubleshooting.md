# Troubleshooting

## Herdr never shows Pi status

1. Confirm Herdr is running: `herdr status`.
2. Confirm Pi was started in a Herdr-managed pane.
3. Confirm this package is present in Pi's package list.
4. Run `/reload` or start a fresh Pi process.
5. Confirm `HERDR_ENV`, `HERDR_SOCKET_PATH`, and `HERDR_PANE_ID` are supplied to the pane without printing credential-bearing environment variables.

The extension is intentionally inactive outside a Herdr TUI pane.

## Duplicate status authority

Do not load this package beside `~/.pi/agent/extensions/herdr-agent-state.ts`. Both use source `herdr:pi`, and independent sequence streams can overwrite one another.

Use this fork:

```bash
herdr integration uninstall pi
```

Then reload Pi. To return to Herdr's bundled integration, remove this package first and run:

```bash
herdr integration install pi
```

Avoid `herdr integration update pi` while using this fork because it can recreate the bundled extension.

## Async subagent shows idle

- Confirm pi-subagents 0.66.0 or a compatible version emits balanced `herdr:busy` events.
- Confirm the run is actually async; completed or foreground runs do not hold the pane busy.
- Reproduce in a fresh Pi session after `/reload`.
- Check that the bundled Herdr extension was not recreated.

Expected semantic sequence for a settled parent is `idle → working` when async work starts, then `working → idle` only after the final active run completes.

## Prompts do not show blocked

Confirm Pi exposes native `ui_prompt_start` / `ui_prompt_end` events. Reproduce with a built-in or trusted extension prompt, not a provider or tool that is merely slow. Never include prompt content in a bug report.

## Pane remains working

Wait through the bounded retry window and confirm whether a parent turn, async busy lease, or attention state is still active. Anonymous event deltas cannot recover a producer that crashed without releasing its lease; `/reload` lets pi-subagents reconstruct active runs from its authoritative run index.

## Installation handoff failed

Do not reload while both the staged package and bundled hook are configured. If `herdr integration uninstall pi` fails, keep the bundled hook, remove the staged package with `pi remove <the exact source shown by pi list>`, and verify the package is absent with `pi list`.

## Rollback

Remove this package first and verify it is absent before restoring Herdr's hook:

```bash
pi list
pi remove npm:@eysenfalk/pi-herdr-status
pi list
herdr integration install pi
```

For Git or local installations, substitute the exact source shown by `pi list`. If package removal fails, stop; do not reinstall the bundled integration beside it. Reload or restart Pi only after exactly one integration remains.

## Reporting a useful bug

Include package, Pi, Herdr, pi-subagents, Node.js, and operating-system versions; expected and observed semantic transitions; installation source; whether the bundled integration is absent; and a minimal content-free timeline.

Do not attach credentials, prompts, transcripts, session files, full environment dumps, or raw socket traffic.
