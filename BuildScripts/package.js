"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const { parseArgs } = require("util");
const tasks = require("./tasks.js");

const { values: options } = parseArgs({
  args: process.argv.slice(2),
  options: {
    version: { type: "string" },
    noversiontransform: { type: "boolean" },
  },
  strict: false,
});

const rawVersion = options.version || "0.0.0";
const noversiontransform = options.noversiontransform || false;

// Parse semver components
const semverParts = rawVersion.split(".");
const major = parseInt(semverParts[0], 10);
const minor = parseInt(semverParts[1], 10);
const patchBase = parseInt(semverParts[2] || "0", 10);

// With --noversiontransform, use patch as-is.
// Without it, apply ADO convention: patch * 1000 + 999.
const patch = noversiontransform ? patchBase : patchBase * 1000 + 999;
const versionString = `${major}.${minor}.${patch}`;

console.log(`Extension Version: ${versionString}`);

const currentDirectory = process.cwd();
const buildOutputDirectory = path.join(currentDirectory, ".BuildOutput");
const extensionDirectory = path.join(currentDirectory, "Extension");
const tasksDirectory = path.join(currentDirectory, "Tasks");

// Lock-file and generated artefact names to exclude when copying task source.
// node_modules are pre-populated by sync-task-node-modules.js during `npm install`
// and are intentionally included in the copy so the VSIX bundles them.
const EXCLUDED_TASK_ITEMS = new Set(["package-lock.json", "yarn.lock"]);

fs.ensureDirSync(buildOutputDirectory);

const configPath = path.join(currentDirectory, "configuration.json");
let configuration;
try {
  configuration = require(configPath);
} catch (err) {
  if (
    err &&
    err.code === "MODULE_NOT_FOUND" &&
    typeof err.message === "string" &&
    err.message.includes(configPath)
  ) {
    throw new Error(
      `configuration.json not found in project root: ${currentDirectory}`,
      { cause: err },
    );
  }

  throw new Error(
    `Failed to load configuration.json from project root: ${currentDirectory}. ${err && err.message ? err.message : "Unknown error."}`,
    { cause: err },
  );
}

for (const env of configuration.environments) {
  const environmentDirectory = path.join(buildOutputDirectory, env.Name);
  const environmentTasksDirectory = path.join(environmentDirectory, "Tasks");

  // Start from a clean output directory to avoid stale artefacts.
  fs.emptyDirSync(environmentDirectory);

  // Copy extension assets (icons, overview, vss-extension.json, etc.)
  fs.copySync(extensionDirectory, environmentDirectory, {
    overwrite: true,
    dereference: true,
  });

  // Copy each task source directory, excluding node_modules and lock files
  const sourceTasks = tasks.getTasks(tasksDirectory);
  for (const task of sourceTasks) {
    const taskOutputDir = path.join(environmentTasksDirectory, task.name);
    fs.ensureDirSync(taskOutputDir);

    for (const item of fs.readdirSync(task.directory)) {
      if (EXCLUDED_TASK_ITEMS.has(item)) {
        continue;
      }
      fs.copySync(
        path.join(task.directory, item),
        path.join(taskOutputDir, item),
        { overwrite: true, dereference: true },
      );
    }
  }

  // Update the extension manifest in the output directory
  const extensionFilePath = path.join(
    environmentDirectory,
    "vss-extension.json",
  );
  const extension = fs.readJsonSync(extensionFilePath);

  extension.id += env.VssExtensionIdSuffix || "";
  if (env.DisplayNamesSuffix) {
    extension.name += env.DisplayNamesSuffix;
  }
  extension.version = versionString;
  if (env.VssExtensionGalleryFlags !== undefined) {
    extension.galleryFlags = env.VssExtensionGalleryFlags;
  }

  // Build contributions list and stamp each included task
  extension.contributions = [];

  const outputTasks = tasks.getTasks(environmentTasksDirectory);
  for (const taskDir of outputTasks) {
    const taskFilePath = path.join(taskDir.directory, "task.json");
    const task = fs.readJsonSync(taskFilePath);
    const taskId = env.TaskIds ? env.TaskIds[taskDir.name] : undefined;

    if (taskId) {
      task.id = taskId;
      if (env.DisplayNamesSuffix) {
        task.friendlyName =
          (task.friendlyName || task.name) + env.DisplayNamesSuffix;
      }
      task.version = { Major: major, Minor: minor, Patch: patch };
      if (task.helpMarkDown) {
        task.helpMarkDown = task.helpMarkDown.replace(
          "#{Version}#",
          versionString,
        );
      }
      fs.writeJsonSync(taskFilePath, task, { spaces: 2 });

      // Convert PascalCase task name to kebab-case for the contribution ID
      const contribId =
        taskDir.name
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .replace(/^-+/, "") + "-task";

      extension.contributions.push({
        id: contribId,
        type: "ms.vss-distributed-task.task",
        description: task.description,
        targets: ["ms.vss-distributed-task.tasks"],
        properties: { name: `Tasks/${taskDir.name}` },
      });

      // Verify that node_modules were copied from the task source directory.
      // They are pre-populated by sync-task-node-modules.js during `npm install`.
      const outputNodeModules = path.join(taskDir.directory, "node_modules");
      if (!fs.existsSync(outputNodeModules)) {
        throw new Error(
          `node_modules missing for ${taskDir.name}. Run \`npm install\` at the repo root first to sync production dependencies.`,
        );
      }
    } else {
      // Task not configured for this environment – remove it from output
      fs.removeSync(taskDir.directory);
    }
  }

  fs.writeJsonSync(extensionFilePath, extension, { spaces: 4 });

  // Create the VSIX using array-form to avoid shell injection
  console.log(`Creating extension for ${env.Name}...`);
  const tfxResult = spawnSync(
    "tfx",
    [
      "extension",
      "create",
      "--root",
      environmentDirectory,
      "--manifest-globs",
      extensionFilePath,
      "--output-path",
      environmentDirectory,
    ],
    { stdio: "inherit", shell: false },
  );
  if (tfxResult.status !== 0) {
    throw new Error(
      `tfx extension create failed for ${env.Name} (exit ${tfxResult.status})`,
    );
  }
  console.log(`tfx extension create done for ${env.Name}`);
}
