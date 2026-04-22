"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Returns a list of task directories under the given root.
 * Defaults to the `Tasks/` directory in the current working directory.
 */
exports.getTasks = (tasksRoot) => {
  const currentDirectory = process.cwd();
  const root = tasksRoot || path.join(currentDirectory, "Tasks");

  return fs
    .readdirSync(root)
    .map((task) => ({
      directory: path.join(root, task),
      name: task,
    }))
    .filter((task) => fs.statSync(task.directory).isDirectory());
};
