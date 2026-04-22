"use strict";

const fs = require("fs-extra");
const path = require("path");
const tasks = require("./tasks.js");

const currentDirectory = process.cwd();
const buildOutputDirectory = path.join(currentDirectory, ".BuildOutput");

fs.emptyDirSync(buildOutputDirectory);
console.log("Cleaned .BuildOutput");

const args = process.argv.slice(2);
if (args.includes("--modules")) {
  tasks.getTasks().forEach((task) => {
    fs.removeSync(path.join(task.directory, "node_modules"));
    console.log(`Removed node_modules for ${task.name}`);
  });
}
