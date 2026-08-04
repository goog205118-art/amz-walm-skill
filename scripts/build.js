const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outDir = path.join(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "skills.manifest.js",
  "sw.js",
  "README.md"
];

const dirs = ["docs"];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(outDir, file));
}

for (const dir of dirs) {
  copyDir(path.join(root, dir), path.join(outDir, dir));
}

console.log(`Built static app into ${outDir}`);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

