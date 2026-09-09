import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const markdown = collectMarkdown(root);
const broken = [];
for (const path of markdown) {
	const content = readFileSync(path, "utf8");
	for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
		const target = match[1].trim().split("#", 1)[0];
		if (!target || /^(?:https?:|mailto:)/u.test(target)) continue;
		if (!existsSync(resolve(dirname(path), decodeURIComponent(target)))) broken.push(`${path}: ${target}`);
	}
}
assert.deepEqual(broken, [], `broken local Markdown links:\n${broken.join("\n")}`);

const readme = readFileSync(join(root, "README.md"), "utf8");
for (const marker of [
	"Make Herdr tell the truth about what Pi is doing.",
	"pi install npm:@eysenfalk/pi-herdr-status",
	"herdr integration uninstall pi",
	"standalone downstream fork",
	"herdr:busy",
	"docs/development-workflow.md",
	"docs/upstream.md",
	'media="(max-width: 700px)"',
]) {
	assert.ok(readme.includes(marker), `README is missing: ${marker}`);
}
for (const requiredFile of ["LICENSE", "NOTICE", "docs/upstream.md"]) {
	assert.ok(existsSync(join(root, requiredFile)), `provenance file is missing: ${requiredFile}`);
}
const upstream = readFileSync(join(root, "docs/upstream.md"), "utf8");
const upstreamCommit = "b99002ac99b09e00b4ca692436cb15a6b0d676f1";
for (const marker of ["v0.9.0", upstreamCommit, "src/integration/assets/pi/herdr-agent-state.ts", "Apache-2.0"]) {
	assert.ok(upstream.includes(marker), `upstream provenance is missing: ${marker}`);
}
for (const runtimeFile of ["core.ts", "herdr-rpc.ts", "index.ts", "recovery.ts"]) {
	const source = readFileSync(join(root, "extensions", "pi-herdr-status", runtimeFile), "utf8");
	assert.ok(source.includes(upstreamCommit), `${runtimeFile} is missing the upstream baseline`);
	assert.ok(source.includes("substantially modified"), `${runtimeFile} is missing its modification notice`);
}
for (const asset of ["demo.svg", "demo-mobile.svg", "gallery.webp", "gallery-mobile.webp"]) {
	assert.ok(existsSync(join(root, "media", asset)), `gallery asset is missing: ${asset}`);
}
const mediaSources = {
	wide: readFileSync(join(root, "media/demo.svg"), "utf8"),
	narrow: readFileSync(join(root, "media/demo-mobile.svg"), "utf8"),
};
for (const svg of Object.values(mediaSources)) {
	assert.match(svg, /faithful cropped/u);
	assert.match(svg, /Pi 0\.85\.1.*Herdr 0\.9\.0/u);
	assert.match(svg, /content-free/u);
}
const captureSources = {
	wide: readFileSync(join(root, "tests/fixtures/real-pi-120.txt"), "utf8"),
	narrow: readFileSync(join(root, "tests/fixtures/real-pi-40.txt"), "utf8"),
};
for (const source of Object.values(captureSources)) {
	for (const marker of [
		"subagent worker-luna [async]",
		"Launched worker-luna asynchronously",
		"worker-luna · running",
		"worker-luna · complete",
		"idle → working → idle",
	]) {
		assert.ok(source.includes(marker), `capture fixture is missing: ${marker}`);
	}
}
const wideDivider = "─".repeat(56);
const narrowDivider = "─".repeat(40);
assert.ok(captureSources.wide.includes(wideDivider) && mediaSources.wide.includes(wideDivider));
assert.ok(captureSources.narrow.includes(narrowDivider) && mediaSources.narrow.includes(narrowDivider));
for (const marker of [
	"subagent worker-luna [async]",
	"Launched worker-luna asynchronously",
	"async subagent · background",
	"worker-luna · running",
	"worker-luna · complete",
]) {
	assert.ok(mediaSources.narrow.includes(marker), `narrow redraw is missing exact fixture text: ${marker}`);
}
const workflow = readFileSync(join(root, "docs/development-workflow.md"), "utf8");
for (const marker of [
	"PI_TUI_WRITE_LOG",
	"ptyCols: 120",
	"ptyCols: 40",
	"faithful transcript redraws",
	"npm run smoke:packed",
	"no automated ANSI replay",
]) {
	assert.ok(workflow.includes(marker), `development workflow is missing: ${marker}`);
}
const ignore = readFileSync(join(root, ".gitignore"), "utf8");
for (const pattern of [".artifacts/", "*.ansi"]) {
	assert.ok(ignore.split("\n").includes(pattern), `raw capture ignore is missing: ${pattern}`);
}

console.log(`Documentation contract OK: ${markdown.length} Markdown files, no broken local links`);

function collectMarkdown(directory) {
	const results = [];
	for (const entry of readdirSync(directory)) {
		if (entry === "node_modules" || entry === ".git") continue;
		const path = join(directory, entry);
		const stat = statSync(path);
		if (stat.isDirectory()) results.push(...collectMarkdown(path));
		else if (entry.endsWith(".md")) results.push(path);
	}
	return results;
}
