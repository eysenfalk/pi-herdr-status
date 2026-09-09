# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0-rc.0]

### Added

- A standalone downstream fork of Herdr's bundled Pi lifecycle integration with exact source/commit provenance and Apache-2.0 licensing.
- Counted `herdr:busy` handling so a settled parent remains semantically `working` while async pi-subagents runs remain active.
- Precedence `blocked > (parent active or async busy) > idle`, including overlap and reload-order handling.
- Native Pi prompt lifecycle handling with fixed content-free labels.
- Acknowledgement-aware serialized reporting, stale-state supersession, bounded retries, cancellation, and a 30-second state heartbeat.
- Deterministic tests, packed-Pi smoke, package/workflow contracts, and public project documentation.

[Unreleased]: https://github.com/eysenfalk/pi-herdr-status/compare/v1.0.0-rc.0...HEAD
[1.0.0-rc.0]: https://github.com/eysenfalk/pi-herdr-status/releases/tag/v1.0.0-rc.0
