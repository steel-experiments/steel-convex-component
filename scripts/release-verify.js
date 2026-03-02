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

assert(typeof scripts.codegen === "string", "scripts.codegen is missing.");
assert(
  typeof scripts.build === "string" && scripts.build.includes("tsc -p tsconfig.json"),
  "build script must run TypeScript compilation.",
);
assert(typeof scripts.typecheck === "string", "scripts.typecheck is missing.");

const missingExports = requiredExports.filter((name) => {
  return !Object.prototype.hasOwnProperty.call(packageJson.exports || {}, name);
});
assert(missingExports.length === 0, `missing required package exports: ${missingExports.join(", ")}`);

const exportedPaths = [];
for (const [, exportConfig] of Object.entries(packageJson.exports || {})) {
  if (typeof exportConfig === "string") {
    exportedPaths.push(exportConfig);
    continue;
  }

  if (exportConfig && typeof exportConfig === "object") {
    for (const candidate of [exportConfig.default, exportConfig.types]) {
      if (typeof candidate === "string") {
        exportedPaths.push(candidate);
      }
    }
  }
}

for (const path of exportedPaths) {
  if (!path.startsWith("./dist/") && !path.startsWith("./_generated/")) {
    continue;
  }
  assert(fs.existsSync(path), `missing exported artifact: ${path}`);
}

console.log("[release-verify] package exports and build pipeline ordering are valid.");
