const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const rootNodeModules = path.join(repoRoot, "node_modules");
const lockPath = path.join(repoRoot, "package-lock.json");

if (!fs.existsSync(rootNodeModules)) {
  throw new Error("Root node_modules is missing. Run npm install first.");
}
if (!fs.existsSync(lockPath)) {
  throw new Error("package-lock.json is missing. Run npm install first.");
}

const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const packageEntries = lock.packages || {};

const findEntryKeyForPackage = (pkgName) => {
  const suffix = `/node_modules/${pkgName}`;
  const direct = `node_modules/${pkgName}`;

  const matches = Object.keys(packageEntries)
    .filter((key) => key === direct || key.endsWith(suffix))
    .sort((a, b) => a.split("/").length - b.split("/").length);

  return matches[0];
};

const findInstalledPathForPackage = (pkgName) => {
  const suffix = `/node_modules/${pkgName}`;
  const direct = `node_modules/${pkgName}`;

  const matches = Object.keys(packageEntries)
    .filter((key) => key === direct || key.endsWith(suffix))
    .sort((a, b) => a.split("/").length - b.split("/").length);

  for (const key of matches) {
    const fullPath = path.join(repoRoot, key);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
};

const taskRuntimeDeps = {
  Yarn: [
    "azure-devops-node-api",
    "azure-pipelines-task-lib",
    "azure-pipelines-tool-lib",
    "fs-extra",
    "ini",
    "ip-address",
    "ltx",
    "q",
    "typed-rest-client",
  ],
  YarnInstaller: [
    "azure-pipelines-task-lib",
    "azure-pipelines-tool-lib",
    "fs-extra",
    "https-proxy-agent",
    "ini",
    "q",
    "tar",
  ],
};

const collectTransitiveDeps = (dep, out) => {
  if (out.has(dep)) {
    return;
  }
  out.add(dep);

  const entryKey = findEntryKeyForPackage(dep);
  const entry = entryKey ? packageEntries[entryKey] : undefined;
  if (!entry || !entry.dependencies) {
    return;
  }

  for (const child of Object.keys(entry.dependencies)) {
    collectTransitiveDeps(child, out);
  }
};

const copyPackage = (pkgName, targetNodeModules) => {
  const src = findInstalledPathForPackage(pkgName);
  const dest = path.join(targetNodeModules, ...pkgName.split("/"));

  if (!src || !fs.existsSync(src)) {
    throw new Error(`Missing installed package: ${pkgName}`);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true, dereference: true });
};

for (const [taskName, deps] of Object.entries(taskRuntimeDeps)) {
  const taskDir = path.join(repoRoot, "Tasks", taskName);
  const targetNodeModules = path.join(taskDir, "node_modules");

  const resolved = new Set();
  deps.forEach((dep) => collectTransitiveDeps(dep, resolved));

  fs.rmSync(targetNodeModules, { recursive: true, force: true });
  fs.mkdirSync(targetNodeModules, { recursive: true });

  for (const dep of resolved) {
    copyPackage(dep, targetNodeModules);
  }

  console.log(
    `Synced ${resolved.size} runtime packages into Tasks/${taskName}/node_modules`,
  );
}
