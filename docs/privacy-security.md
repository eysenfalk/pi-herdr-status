# Privacy and security

## Data flow

The runtime reads Pi lifecycle event names and prompt kinds. During Herdr-managed TUI sessions it requests and parses the current pane's `pane.get` response from Herdr's local socket, then returns and uses only its semantic `agent_status` field. Other response fields are neither retained nor emitted.

It does **not** inspect, use, retain, or emit:

- prompt titles, values, or editor contents;
- user messages or assistant responses;
- session transcripts;
- tool names, arguments, or results;
- filesystem contents or path fields that may accompany the parsed response;
- model credentials or provider settings.

Fixed status labels such as `Waiting for user confirmation` are emitted locally through Pi's shared event bus.

## Network posture

There are no internet requests, analytics, update checks, or model calls. `node:net` connects only to the endpoint supplied by Herdr through `HERDR_SOCKET_PATH`; on Windows this becomes the corresponding local named pipe. Each read has a one-second timeout and a 64 KiB response limit, is abortable, and fails closed.

## Supply chain

- No runtime dependencies.
- No install, post-install, or prepare scripts.
- CI actions are pinned to full commit SHAs.
- Release automation uses npm Trusted Publishing with provenance through a protected GitHub environment.
- The packed artifact is allowlist-checked and loaded in a temporary, offline Pi home before release.

## Local authority

Pi extensions execute with the permissions of the Pi process. Herdr controls the socket location and pane identity through environment variables. Review the source and package provenance before installation.

## Threat boundary

This package does not authenticate the local Herdr socket independently. It relies on Herdr's process and filesystem controls. A malicious process that can replace that socket or alter Pi's environment is already inside the local process-level trust boundary.
