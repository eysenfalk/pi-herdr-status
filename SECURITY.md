# Security policy

## Supported versions

Security fixes are provided for the latest published release. Upgrade with:

```bash
pi update npm:@eysenfalk/pi-herdr-status
```

## Reporting a vulnerability

Use GitHub private vulnerability reporting from the repository's Security tab. Do not open a public issue or include sensitive details in public messages.

Include the affected version, impact, minimal content-free reproduction, and suggested mitigation. You can expect acknowledgement within seven days.

## Security posture

- No runtime dependencies or install hooks.
- No analytics, internet requests, subprocesses, persistence, or model calls.
- The extension writes only lifecycle/session RPCs to Herdr's environment-provided local socket.
- Responses must match the request ID, contain no RPC error, remain below 64 KiB, and arrive within bounded timeouts.
- Prompt titles, values, contents, transcripts, tools, and credentials are not inspected, used, retained, or emitted.
- Native prompts use fixed labels; trusted sibling busy/block labels are control-stripped and bounded.
- Delivery retry, heartbeat, active sockets, and event subscriptions cancel on shutdown.
- Upstream Apache-2.0 provenance is distributed in `NOTICE` and `docs/upstream.md`.
- CI actions are pinned to immutable commit SHAs.
- Stable releases use npm Trusted Publishing with provenance through a protected GitHub environment.

## Authority warning

This fork and Herdr's bundled Pi extension both publish source `herdr:pi`. Loading both is unsupported and can produce conflicting lifecycle sequences. Remove the bundled integration before installing this package.

Pi extensions execute with Pi's local permissions. Review source and provenance before installing any Pi package.
