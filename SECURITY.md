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
- A current-pane `pane.get` response is parsed locally; only its semantic status is returned or used, and other fields are not retained or emitted. Reads have a one-second timeout and a 64 KiB response limit.
- Prompt content, transcripts, path fields, tools, and credentials are not inspected, used, retained, or emitted; unrelated fields may be present in the locally parsed `pane.get` response and are discarded.
- CI actions are pinned to immutable commit SHAs.
- Stable releases use npm Trusted Publishing with provenance through a protected GitHub environment.

Pi extensions execute with Pi's local permissions. Review source and provenance before installing any Pi package.
