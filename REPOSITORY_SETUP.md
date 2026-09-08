# Repository setup checklist

Controls that cannot be enforced from source are recorded here for auditability. Nothing in this checklist is complete until independently verified after repository creation.

## GitHub — deferred pending explicit owner approval

- [ ] Create public repository `eysenfalk/pi-herdr-status` with description: `Keep Herdr's Pi status accurate through prompts and dropped lifecycle reports.`
- [ ] Add topics: `pi-package`, `pi-coding-agent`, `herdr`, `terminal`, `tui`, `lifecycle`, `status`, `typescript`.
- [ ] Enable Issues and Discussions; disable Wiki; enable automatic branch deletion.
- [ ] Enable private vulnerability reporting.
- [ ] Enable Dependabot alerts/security updates, secret scanning, and push protection.
- [ ] Reduce default workflow-token permission to read-only.
- [ ] Require CI and CodeQL on `main`, resolved conversations, one code-owner review for non-maintainer changes, linear history, and no force push/deletion.
- [ ] Create protected `npm` environment requiring maintainer approval.
- [ ] Upload `media/gallery.webp` as the social preview.
- [ ] Add npm as homepage after stable publication.

## npm — deferred pending separate explicit approval

- [ ] Confirm `@eysenfalk/pi-herdr-status` remains available.
- [ ] Require 2FA on the maintainer account.
- [ ] Create, hash, inspect, and publish the same reviewed `v1.0.0-rc.0` checkout tarball by exact filename with the `next` tag for trust bootstrap; never publish an unpacked working tree.
- [ ] Configure and verify npm Trusted Publishing immediately afterward.
- [ ] Publish stable `1.0.0` only through the protected OIDC workflow and verify provenance.

## Pi gallery — deferred with npm

After npm publication, verify the package card, responsive image, description, install source, repository link, and security note at desktop and narrow widths.
