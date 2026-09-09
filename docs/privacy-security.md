# Privacy and security

## Data flow

The runtime reads Pi lifecycle event names, `ctx.isIdle()`, session identity, prompt kinds, and sibling `herdr:busy` / `herdr:blocked` payloads. It sends local lifecycle and session reports to the endpoint supplied in `HERDR_SOCKET_PATH`.

It does **not** inspect, use, retain, or emit:

- prompt titles, values, editor contents, or user answers;
- user messages or assistant responses;
- session transcript contents;
- tool names, arguments, or results;
- model credentials or provider settings.

Pi's session path or ID is sent locally to Herdr because session linking is part of the upstream integration contract. Busy and blocker labels from trusted sibling extensions are normalized, stripped of control characters, and bounded to 160 Unicode characters before local reporting. Native prompts use fixed labels selected only by prompt kind.

## Network posture

There are no internet requests, analytics, update checks, or model calls. `node:net` connects only to `HERDR_SOCKET_PATH`; on Windows this becomes the corresponding local named pipe. Each response is limited to 64 KiB, must match the request ID, must contain no RPC error, and is discarded after acknowledgement. Requests time out, are abortable, and retry with bounded backoff.

A 30-second heartbeat writes the current authoritative status. It does not read pane output or call `pane.get`.

## Supply chain

- No runtime dependencies.
- No install, post-install, or prepare scripts.
- CI actions are pinned to full commit SHAs.
- Release automation uses npm Trusted Publishing with provenance through a protected GitHub environment.
- The packed artifact is allowlist-checked and loaded in a temporary offline Pi home before release.
- Upstream origin, exact baseline commit, modification summary, and Apache-2.0 license are distributed with the package.

## Local authority

Pi extensions execute with the Pi process's permissions. Herdr controls socket location and pane identity through environment variables. This fork deliberately owns source `herdr:pi`, so loading Herdr's bundled integration at the same time is unsupported and can produce conflicting sequences.

## Threat boundary

The package does not independently authenticate the local Herdr socket or trusted in-process event producers. A process that can replace that socket, alter Pi's environment, or execute another Pi extension is already inside the local process trust boundary.
