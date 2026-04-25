const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const args = process.argv.slice(2);

const getOptionValue = (name) => {
  const prefixed = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefixed));
  if (inline) {
    return inline.slice(prefixed.length);
  }

  const idx = args.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0 && idx + 1 < args.length) {
    return args[idx + 1];
  }

  return undefined;
};

const hasFlag = (name) => args.includes(`--${name}`);

const parseSemver = (version) => {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z.-]+))?$/.exec(
    version || "",
  );
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4],
  };
};

const getExtensionVersion = () => {
  const versionInput = getOptionValue("version") || "0.0.0";
  const parsed = parseSemver(versionInput);
  let patch = parsed.patch;

  if (!hasFlag("noversiontransform")) {
    patch *= 1000;
    if (parsed.prerelease) {
      const preParts = parsed.prerelease.split(".");
      const candidate = Number.parseInt(preParts[1] || preParts[0], 10);
      patch += Number.isNaN(candidate) ? 0 : candidate;
    } else {
      patch += 999;
    }
  }

  return {
    major: parsed.major,
    minor: parsed.minor,
    patch,
    asString: `${parsed.major}.${parsed.minor}.${patch}`,
  };
};

const cwd = process.cwd();
const buildOutputDir = path.join(cwd, ".BuildOutput");
const extensionDir = path.join(cwd, "Extension");
const tasksDir = path.join(cwd, "Tasks");
const endpointsDir = path.join(cwd, "Endpoints");

const configurationPath = path.join(cwd, "configuration.json");
if (!fs.existsSync(configurationPath)) {
  throw new Error(
    "configuration.json not found. Run BuildScripts/generate-configuration-json.js first.",
  );
}

const configuration = JSON.parse(fs.readFileSync(configurationPath, "utf8"));
const version = getExtensionVersion();

const readEnv = (...names) => {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  throw new Error(
    `Missing required environment variable. Expected one of: ${names.join(", ")}`,
  );
};

const publisherId = readEnv("PUBLISHER_ID");
const publicExtensionId = readEnv("PUBLIC_EXTENSION_ID");
const privateExtensionId = readEnv("PRIVATE_EXTENSION_ID");
const publicExtensionName = readEnv("PUBLIC_EXTENSION_NAME");
const privateExtensionName = readEnv("PRIVATE_EXTENSION_NAME");
const taskYarnName = readEnv("TASK_YARN_NAME");
const taskYarnInstallerName = readEnv("TASK_YARN_INSTALLER_NAME");

const resolveToken = (value, replacements) => {
  if (typeof value !== "string") {
    return value;
  }

  let next = value;
  for (const [token, replacement] of Object.entries(replacements)) {
    next = next.split(token).join(replacement);
  }
  return next;
};

fs.mkdirSync(buildOutputDir, { recursive: true });

const endpoints = fs.existsSync(endpointsDir)
  ? fs.readdirSync(endpointsDir).map((file) => {
      const endpointPath = path.join(endpointsDir, file);
      const manifest = JSON.parse(fs.readFileSync(endpointPath, "utf8"));
      return {
        manifest,
        name: manifest.properties.name,
      };
    })
  : [];

const updateTaskLocalization = (taskPath, env, currentVersion) => {
  const locPath = path.join(taskPath, "task.loc.json");
  if (!fs.existsSync(locPath)) {
    return;
  }

  const taskLoc = JSON.parse(fs.readFileSync(locPath, "utf8"));
  taskLoc.id = env.TaskIds[path.basename(taskPath)];
  taskLoc.friendlyName = `${taskLoc.friendlyName}${env.DisplayNamesSuffix}`;
  taskLoc.version = {
    Major: currentVersion.major,
    Minor: currentVersion.minor,
    Patch: currentVersion.patch,
  };

  if (typeof taskLoc.helpMarkDown === "string") {
    taskLoc.helpMarkDown = taskLoc.helpMarkDown.replace(
      "#{Version}#",
      currentVersion.asString,
    );
  }

  fs.writeFileSync(locPath, JSON.stringify(taskLoc, null, 2) + "\n");

  const resourcesDir = path.join(taskPath, "Strings", "resources.resjson");
  if (!fs.existsSync(resourcesDir)) {
    return;
  }

  for (const lang of fs.readdirSync(resourcesDir)) {
    const resPath = path.join(resourcesDir, lang, "resources.resjson");
    if (!fs.existsSync(resPath)) {
      continue;
    }

    const resource = JSON.parse(fs.readFileSync(resPath, "utf8"));
    if (typeof resource["loc.helpMarkDown"] === "string") {
      resource["loc.helpMarkDown"] = resource["loc.helpMarkDown"].replace(
        "#{Version}#",
        currentVersion.asString,
      );
      fs.writeFileSync(resPath, JSON.stringify(resource, null, 2) + "\n");
    }
  }
};

for (const env of configuration.environments) {
  const envDir = path.join(buildOutputDir, env.Name);
  const envTasksDir = path.join(envDir, "Tasks");

  fs.rmSync(envDir, { recursive: true, force: true });
  fs.mkdirSync(envDir, { recursive: true });

  fs.cpSync(extensionDir, envDir, {
    recursive: true,
    force: true,
    dereference: true,
  });
  fs.cpSync(tasksDir, envTasksDir, {
    recursive: true,
    force: true,
    dereference: true,
  });

  const extensionPath = path.join(envDir, "vss-extension.json");
  const extension = JSON.parse(fs.readFileSync(extensionPath, "utf8"));

  const baseExtensionId =
    env.Name === "dev" ? privateExtensionId : publicExtensionId;
  const baseExtensionName =
    env.Name === "dev" ? privateExtensionName : publicExtensionName;

  extension.id = resolveToken(extension.id, {
    "#{extensionId}#": baseExtensionId,
  });
  extension.name = resolveToken(extension.name, {
    "#{extensionName}#": baseExtensionName,
  });
  extension.publisher = resolveToken(extension.publisher, {
    "#{publisherId}#": publisherId,
  });

  extension.id = `${extension.id}${env.VssExtensionIdSuffix}`;
  extension.name = `${extension.name}${env.DisplayNamesSuffix}`;
  extension.version = version.asString;
  extension.galleryFlags = env.VssExtensionGalleryFlags;
  extension.contributions = Array.isArray(extension.contributions)
    ? extension.contributions
    : [];

  const endpointMap = {};
  for (const endpoint of endpoints) {
    endpointMap[`connectedService:${endpoint.name}`] =
      `connectedService:${endpoint.name}${env.VssExtensionIdSuffix}`;

    const endpointManifest = JSON.parse(JSON.stringify(endpoint.manifest));
    endpointManifest.id = `${endpointManifest.id}${env.VssExtensionIdSuffix}`;
    endpointManifest.properties.name = `${endpoint.name}${env.VssExtensionIdSuffix}`;
    endpointManifest.properties.displayName = `${endpointManifest.properties.displayName}${env.DisplayNamesSuffix}`;
    extension.contributions.push(endpointManifest);
  }

  for (const taskName of fs.readdirSync(envTasksDir)) {
    const taskPath = path.join(envTasksDir, taskName);
    if (!fs.statSync(taskPath).isDirectory()) {
      continue;
    }

    const taskJsonPath = path.join(taskPath, "task.json");
    if (!fs.existsSync(taskJsonPath)) {
      continue;
    }

    const task = JSON.parse(fs.readFileSync(taskJsonPath, "utf8"));
    const taskId = env.TaskIds[taskName];

    if (!taskId) {
      fs.rmSync(taskPath, { recursive: true, force: true });
      continue;
    }

    task.id = taskId;
    task.name = resolveToken(task.name, {
      "#{taskYarnName}#": taskYarnName,
      "#{taskYarnInstallerName}#": taskYarnInstallerName,
    });
    task.author = resolveToken(task.author, {
      "#{author}#": publisherId,
    });
    task.friendlyName = `${task.friendlyName}${env.DisplayNamesSuffix}`;
    task.version = {
      Major: version.major,
      Minor: version.minor,
      Patch: version.patch,
    };

    if (typeof task.helpMarkDown === "string") {
      task.helpMarkDown = task.helpMarkDown.replace(
        "#{Version}#",
        version.asString,
      );
    }

    if (Array.isArray(task.inputs)) {
      for (const input of task.inputs) {
        const mappedType = endpointMap[input.type];
        if (mappedType) {
          input.type = mappedType;
        }
      }
    }

    fs.writeFileSync(taskJsonPath, JSON.stringify(task, null, 2) + "\n");
    updateTaskLocalization(taskPath, env, version);

    const contributionId = `${taskName
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^[-]+/, "")}-task`;
    extension.contributions.push({
      description: task.description,
      id: contributionId,
      properties: {
        name: `Tasks/${taskName}`,
      },
      targets: ["ms.vss-distributed-task.tasks"],
      type: "ms.vss-distributed-task.task",
    });
  }

  fs.writeFileSync(extensionPath, JSON.stringify(extension, null, 2) + "\n");

  const cmd = `npx tfx extension create --root "${envDir}" --manifest-globs "${extensionPath}" --output-path "${envDir}"`;
  console.log(`Packaging environment '${env.Name}' with command: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}
