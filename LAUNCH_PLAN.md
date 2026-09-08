# Launch plan

This is an owner checklist, not permission to create repositories, publish packages, or post externally.

## Positioning

Lead with the concrete failure, not generic AI-tool marketing:

> Pi is waiting for your answer, but Herdr still says working. Or Pi finished, but the pane never settled. Pi Herdr Status fixes those two status gaps without replacing Herdr's official integration.

The proof is the real `done → blocked → done` journey, the small architecture, zero runtime dependencies, content-free privacy boundary, and explicit residual limits.

## Launch order

1. Create the public GitHub repository only after explicit approval.
2. Apply and verify every control in [REPOSITORY_SETUP.md](REPOSITORY_SETUP.md).
3. Upload the 1280×640 `media/gallery.webp` social preview. GitHub recommends at least 640×320 and 1280×640 for best display: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview>.
4. Let CI and CodeQL pass on the public default branch.
5. Open one small `good first issue` only if real follow-up work exists; never manufacture activity.
6. Publish and verify the release candidate only after separate npm approval.
7. Ask early users for a content-free status timeline and platform/version matrix, not stars.
8. Prepare stable `1.0.0` only after the release-candidate journey succeeds from npm.

## Reddit approach

Reddit explicitly says promotion is not automatically spam, but repeated self-linking and primarily promotional participation can be spam. Some communities apply a 10% self-promotion convention: <https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community> and <https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam>.

At launch time:

- read the current rules of each community;
- use a designated self-promotion thread when required;
- ask moderators before posting if the rule is ambiguous;
- disclose ownership plainly;
- post once per permitted community, never cross-post mechanically;
- do not solicit votes, use alternate accounts, automate comments, or disguise links;
- stay present to answer technical questions and accept criticism.

A current low-risk venue is the recurring r/ChatGPTCoding self-promotion thread, which states that each project may be promoted once. Recheck the live thread and rules immediately before posting. r/github uses a self-promotion megathread rather than ordinary link posts. Do not assume r/programming, r/commandline, r/opensource, or any other community permits this project without checking that day's rules.

## Draft Reddit post

**Title**

> I fixed the awkward gap where Herdr says Pi is “working” while Pi is actually waiting for you

**Body**

> Disclosure: I built this.
>
> I use Pi inside Herdr and kept hitting two misleading states: native Pi dialogs did not reliably appear as blocked, and a dropped final lifecycle report could leave a finished pane stuck on working.
>
> `pi-herdr-status` is the narrow fix. It does not patch or replace Herdr's managed integration. It translates Pi's native prompt lifecycle into Herdr's existing blocked event, then uses a read-only local-socket heartbeat to detect confirmed mismatches. Recovery is a balanced event pulse that makes the official integration resend its own authoritative state.
>
> It has zero runtime dependencies, no analytics/model calls, never reads prompt content, and is tested against Pi 0.85.1 + Herdr 0.9.0. The hardest design constraint was preserving Herdr's anonymous blocker count when another extension is also waiting.
>
> Demo and source: REPOSITORY_URL
>
> I would especially value reports from macOS/Windows users and adversarial feedback on the lifecycle boundary.

Before posting, replace the placeholder, shorten if the target community prefers concise posts, and verify every claim against the released artifact.

## Success signals

Measure usefulness rather than launch-day rank:

- clean installs from the exact tagged artifact;
- confirmed fixes with content-free reproductions;
- compatibility reports across Pi, Herdr, Node.js, and platforms;
- issue response time and resolved regressions;
- repeat contributors and downstream references.

No process can guarantee a #1 Reddit post. The controllable strategy is a sharp problem statement, visible proof, low-friction installation, trustworthy engineering, honest limits, and genuine community participation.
