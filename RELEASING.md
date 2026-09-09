# Releasing

Releases are maintainer-only and follow Semantic Versioning.

## Prepare

1. Update `CHANGELOG.md` and `package.json` in a reviewed pull request.
2. Compare the current upstream Herdr integration with the pinned baseline in `docs/upstream.md`; update provenance when needed.
3. Run `npm ci --ignore-scripts`, `npm run check`, `npm run smoke:packed`, and the real Herdr/Pi parent/async/prompt journey with the bundled integration absent.
4. Inspect `npm pack --dry-run --json` and the extracted tarball, including `LICENSE`, `NOTICE`, and `docs/upstream.md`.
5. Confirm the version is absent from npm.
6. Obtain independent correctness/security and documentation/provenance/release review.

## Release-candidate tag

After the repository exists and the candidate is approved, create the exact annotated tag `v1.0.0-rc.0` from reviewed `main` and publish it as a GitHub **prerelease**. The npm workflow skips prereleases. Users can then test the Git artifact with:

```bash
pi install git:github.com/eysenfalk/pi-herdr-status@v1.0.0-rc.0
```

The later interactive npm trust bootstrap uses the same reviewed commit and version.

## Stable releases

1. Merge the release commit to `main`.
2. Publish the matching GitHub release tag, exactly `vX.Y.Z`.
3. The release workflow verifies the tag, confirms the tagged commit is contained in `main`, repeats all checks, smoke-tests the packed package, and publishes through npm Trusted Publishing with provenance.
4. Install the exact npm version in a clean Herdr/Pi environment and repeat the release journey.
5. Verify npm provenance, the Pi package gallery entry, and GitHub release assets.

The GitHub `npm` environment must require maintainer approval. Configure npm Trusted Publishing for `eysenfalk/pi-herdr-status`, workflow `release.yml`, and environment `npm`; do not store a long-lived npm token.

## One-time trusted-publisher bootstrap

npm requires a package to exist before a Trusted Publisher can be attached. Use one explicit exception for `1.0.0-rc.0`; stable releases must never use it.

1. Complete repository controls, make the repository public, enable private vulnerability reporting, and verify the protected `npm` environment.
2. From the reviewed `v1.0.0-rc.0` checkout, run `rm -rf .artifacts && mkdir -p .artifacts`, create the exact artifact with `npm pack --ignore-scripts --pack-destination .artifacts`, hash it with `sha256sum .artifacts/eysenfalk-pi-herdr-status-1.0.0-rc.0.tgz`, compare that SHA-256 with the retained review record, and inspect that same tarball.
3. Publish that exact file interactively with account 2FA and the `next` tag: `npm publish .artifacts/eysenfalk-pi-herdr-status-1.0.0-rc.0.tgz --access public --tag next`.
4. Immediately configure the Trusted Publisher for repository `eysenfalk/pi-herdr-status`, workflow `release.yml`, and environment `npm`.
5. Verify the trust relationship, then prepare reviewed `1.0.0` and publish only through the protected release workflow.

No token or OTP belongs in repository files, shell arguments, logs, or transcripts.

## Rollback

npm versions are immutable. If a release is defective, mark it clearly, deprecate it with a migration message, publish a fixed patch through the normal workflow, and never rewrite tags or reuse a version.
