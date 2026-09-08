import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
for (const [source, output, width] of [
	["demo.svg", "gallery.webp", 1280],
	["demo-mobile.svg", "gallery-mobile.webp", 800],
]) {
	const svg = readFileSync(resolve(root, "media", source), "utf8");
	const renderer = new Resvg(svg, { fitTo: { mode: "width", value: width } });
	await sharp(renderer.render().asPng())
		.webp({ quality: 92, smartSubsample: true })
		.toFile(resolve(root, "media", output));
}
console.log("Rendered gallery assets from reviewed SVG sources");
