const fs = require("fs");
const path = require("path");

const copyChildren = (sourceDir, targetDir) => {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  for (const child of fs.readdirSync(sourceDir)) {
    fs.cpSync(path.join(sourceDir, child), path.join(targetDir, child), {
      recursive: true,
      force: true,
      dereference: true,
    });
  }
};

const tasksRoot = path.join(process.cwd(), "Tasks");
const nodeCommon = path.join(process.cwd(), "Common", "Node");
const powershellCommon = path.join(process.cwd(), "Common", "PowerShell3");

if (!fs.existsSync(tasksRoot)) {
  process.exit(0);
}

for (const entry of fs.readdirSync(tasksRoot)) {
  const taskDir = path.join(tasksRoot, entry);
  if (!fs.statSync(taskDir).isDirectory()) {
    continue;
  }

  const taskJsonPath = path.join(taskDir, "task.json");
  if (!fs.existsSync(taskJsonPath)) {
    continue;
  }

  const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, "utf8"));
  const execution = taskJson.execution || {};

  if (
    execution.Node ||
    execution.Node10 ||
    execution.Node16 ||
    execution.Node20_1
  ) {
    copyChildren(nodeCommon, path.join(taskDir, "common"));
  }

  if (execution.PowerShell3) {
    copyChildren(powershellCommon, path.join(taskDir, "ps_modules"));
  }
}
