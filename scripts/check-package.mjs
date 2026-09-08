import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

assert.equal(manifest.name, "@eysenfalk/pi-herdr-status");
assert.equal(manifest.license, "MIT");
assert.ok(manifest.keywords.includes("pi-package"), "package must remain discoverable in the Pi gallery");
assert.ok(manifest.keywords.includes("herdr"), "package must remain discoverable for Herdr users");
assert.deepEqual(manifest.pi.extensions, ["./extensions/pi-herdr-status/index.ts"]);
assert.ok(manifest.pi.image.startsWith("https://"), "gallery image must use HTTPS");
assert.ok(
	!manifest.scripts?.install && !manifest.scripts?.postinstall && !manifest.scripts?.prepare,
	"runtime install hooks are forbidden",
);
assert.equal(manifest.dependencies, undefined, "runtime dependencies are forbidden");

const runtimeFiles = ["core.ts", "herdr-rpc.ts", "index.ts", "recovery.ts"];
const runtimeSource = runtimeFiles
	.map((file) => readFileSync(join(root, "extensions/pi-herdr-status", file), "utf8"))
	.join("\n");
const directLifecycleReport = /pane\.report[_-]agent|pane\.report[_-]agent_session|session\.report/u;
for (const forbiddenName of ["pane.report_agent", "pane.report_agent_session", "pane.report-agent", "session.report"]) {
	assert.match(forbiddenName, directLifecycleReport, `lifecycle method detector missed ${forbiddenName}`);
}
for (const [label, pattern] of [
	["internet fetch", /\bfetch\s*\(/u],
	["HTTP client", /node:https?|\bWebSocket\b/u],
	["child process", /node:child_process/u],
	["model message injection", /\bsendMessage\s*\(/u],
	["direct Herdr lifecycle report", directLifecycleReport],
]) {
	assert.doesNotMatch(runtimeSource, pattern, `runtime source must not contain ${label}`);
}
for (const sensitiveField of ["event.title", "event.value", "event.content", "event.prompt"]) {
	assert.ok(!runtimeSource.includes(sensitiveField), `runtime source must not inspect ${sensitiveField}`);
}

for (const relativePath of manifest.pi.extensions) {
	assert.ok(existsSync(resolve(root, relativePath)), `missing Pi extension: ${relativePath}`);
}

const packed = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
	cwd: root,
	encoding: "utf8",
	timeout: 30_000,
});
assert.equal(packed.status, 0, packed.stderr || "npm pack --dry-run failed");
const packOutput = JSON.parse(packed.stdout);
const report = Array.isArray(packOutput) ? packOutput[0] : Object.values(packOutput)[0];
assert.ok(report && typeof report === "object", "npm pack returned no package report");
assert.ok(report.files.length > 0, "npm tarball would be empty");
assert.ok(report.unpackedSize < 250_000, `npm tarball is unexpectedly large: ${report.unpackedSize} bytes`);

const paths = report.files.map((file) => file.path);
const forbidden = paths.filter((path) =>
	/(^|\/)(tests?|scripts?|\.github|REPOSITORY_SETUP\.md|AGENTS\.md|node_modules|coverage|\.env)/iu.test(path),
);
assert.deepEqual(forbidden, [], `private or development-only files would be published: ${forbidden.join(", ")}`);

const expectedPaths = [
	"package.json",
	"README.md",
	"LICENSE",
	"CHANGELOG.md",
	"SECURITY.md",
	"extensions/pi-herdr-status/index.ts",
	"extensions/pi-herdr-status/core.ts",
	"extensions/pi-herdr-status/recovery.ts",
	"extensions/pi-herdr-status/herdr-rpc.ts",
	"docs/architecture.md",
	"docs/compatibility.md",
	"docs/development-workflow.md",
	"docs/privacy-security.md",
	"docs/troubleshooting.md",
	"media/demo.svg",
	"media/demo-mobile.svg",
	"media/gallery.webp",
	"media/gallery-mobile.webp",
];
assert.deepEqual(
	paths.toSorted(),
	expectedPaths.toSorted(),
	`npm tarball paths differ from the explicit allowlist:\n${paths.join("\n")}`,
);

console.log(`Package contract OK: ${paths.length} explicitly allowlisted files, ${report.unpackedSize} unpacked bytes`);
