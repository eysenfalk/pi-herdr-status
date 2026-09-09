# Launch plan

This is an owner checklist, not permission to create repositories, publish packages, install the fork actively, or post externally.

## Positioning

Lead with the concrete semantic failure and the replacement boundary:

> An async Pi subagent is still working, but Herdr marks the parent pane idle. Pi Herdr Status is a standalone fork of Herdr's Pi lifecycle hook that understands async busy leases, native prompts, and dropped reports through one status authority.

The proof must include a real `idle → working → idle` async-child journey, prompt `idle → blocked → idle`, exact upstream provenance, zero runtime dependencies, and an explicit warning not to co-install the bundled integration.

## Launch order

1. Complete deterministic, packed-artifact, real async Herdr/Pi, responsive TUI, comparison, and independent-review gates.
2. Create the public GitHub repository only after explicit approval.
3. Apply and verify every control in [REPOSITORY_SETUP.md](REPOSITORY_SETUP.md).
4. Upload the reviewed 1280×640 `media/gallery.webp` social preview.
5. Let CI and CodeQL pass on the public default branch.
6. Publish and verify the release candidate only after separate npm approval.
7. Ask early users for content-free semantic timelines and platform/version matrices, not stars.
8. Prepare stable `1.0.0` only after installation, rollback, and upstream-refresh procedures work from released artifacts.

## Reddit approach

Reddit explicitly says promotion is not automatically spam, but repeated self-linking and primarily promotional participation can be spam. Some communities apply a 10% self-promotion convention: <https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community> and <https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam>.

At launch time, re-read each community's current rules, use designated threads, disclose ownership, ask moderators when ambiguous, post once, never solicit votes, and remain available for technical questions. Do not assume any venue remains suitable without a same-day check.

## Draft post

**Title**

> I fixed Herdr marking Pi idle while async subagents are still working

**Body**

> Disclosure: I built this.
>
> Herdr's bundled Pi lifecycle hook tracks the parent agent, but pi-subagents can keep running after that parent settles. The result is semantically wrong: Herdr says idle while async work is active.
>
> `pi-herdr-status` is a standalone downstream fork of that hook. It keeps one `herdr:pi` source/sequence authority, adds counted async busy leases, native prompt blocking, acknowledgement-aware retry, and a 30-second heartbeat. Blocking still wins over working, and the final async completion returns to idle.
>
> It has zero runtime dependencies, no analytics/model calls, never reads prompt content, and records the exact Herdr source commit and Apache-2.0 provenance. It replaces the bundled hook rather than running beside it.
>
> Demo and source: REPOSITORY_URL
>
> I would especially value macOS/Windows reports and adversarial feedback on reload/crash behavior.

Before posting, replace the placeholder and verify every claim against the released artifact.

## Success signals

Measure clean installs and rollbacks, confirmed semantic fixes, compatibility reports, issue response time, resolved regressions, and useful upstream feedback. No process can guarantee launch rank; trustworthy evidence and honest limits are the controllable outcomes.
