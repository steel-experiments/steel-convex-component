import fs from "node:fs";

const requiredExports = [
  ".",
  "./convex.config.js",
  "./convex.config",
  "./_generated/component.js",
  "./_generated/component",
  "./test",
];

function assert(condition, message) {
  if (!condition) {
    console.error(`[release-verify] ${message}`);
    process.exit(1);
  }
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const scripts = packageJson.scripts || {};
const buildScript = scripts.build || "";

assert(typeof scripts.codegen === "string", "scripts.codegen is missing.");
assert(
  typeof scripts.build === "string" &&
    buildScript.includes("convex codegen --component-dir ./src/component"),
  "build script must run convex codegen before TypeScript compilation.",
);
assert(
  buildScript.indexOf("convex codegen --component-dir ./src/component") <
    buildScript.indexOf("tsc -p tsconfig.json"),
  "component codegen must run before TypeScript compile in build script.",
);
assert(typeof scripts.typecheck === "string", "scripts.typecheck is missing.");

const missingExports = requiredExports.filter((name) => {
  return !Object.prototype.hasOwnProperty.call(packageJson.exports || {}, name);
});
assert(missingExports.length === 0, `missing required package exports: ${missingExports.join(", ")}`);

console.log("[release-verify] package exports and build pipeline ordering are valid.");
