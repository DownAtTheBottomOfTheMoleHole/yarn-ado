import * as fs from "fs-extra";
import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import * as path from "path";
import * as toolLib from "azure-pipelines-tool-lib/tool";
import { IncomingMessage } from "http";
import { downloadFrom } from "./download";
import { downloadFile, getTempPath, detar } from "./util";

const yarnVersionsFile = path.join(getTempPath(), "yarnVersions.json");
const yarnReleasesApiUrl =
  "https://api.github.com/repos/yarnpkg/yarn/releases?per_page=100&page=";

type YarnVersionIndex = {
  [key: string]: { uri: string; isPrerelease: boolean };
};

type GitHubRelease = {
  tag_name: string;
  prerelease: boolean;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
};

const corepackAliases = new Set(["berry", "stable", "canary"]);

function getRequestedMajorVersion(versionSpec: string): number | undefined {
  const match = versionSpec.trim().match(/\d+/);
  if (!match) {
    return undefined;
  }

  return Number.parseInt(match[0], 10);
}

export function shouldUseCorepackForVersionSpec(versionSpec: string): boolean {
  const normalized = versionSpec.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (corepackAliases.has(normalized)) {
    return true;
  }

  const requestedMajorVersion = getRequestedMajorVersion(normalized);
  return requestedMajorVersion !== undefined && requestedMajorVersion >= 2;
}

async function execTool(command: string, args: string[]): Promise<void> {
  const runner: tr.ToolRunner = tl.tool(command);
  runner.arg(args);

  const exitCode = await runner.exec({
    failOnStdErr: false,
    ignoreReturnCode: true,
  });

  if (exitCode !== 0) {
    throw new Error(
      `Command '${command} ${args.join(" ")}' failed with exit code ${exitCode}.`,
    );
  }
}

async function getModernYarn(versionSpec: string): Promise<void> {
  const corepackPath = tl.which("corepack", false);
  if (!corepackPath) {
    throw new Error(
      "Corepack is required to provision Yarn 2+ but was not found on the agent PATH.",
    );
  }

  const corepackShimPath = path.join(getTempPath(), "corepack-bin");
  fs.ensureDirSync(corepackShimPath);

  tl.debug(`Enabling Corepack shims in ${corepackShimPath}`);
  await execTool(corepackPath, [
    "enable",
    "--install-directory",
    corepackShimPath,
  ]);

  toolLib.prependPath(corepackShimPath);

  tl.debug(`Preparing Yarn ${versionSpec} with Corepack`);
  await execTool(corepackPath, [
    "prepare",
    `yarn@${versionSpec}`,
    "--activate",
  ]);

  const yarnPath = tl.which("yarn", false);
  if (!yarnPath) {
    throw new Error(
      `Corepack prepared Yarn '${versionSpec}' but no yarn executable was found on PATH.`,
    );
  }

  tl.debug(`Corepack activated Yarn at ${yarnPath}`);
}

async function readResponseBody(response: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    let body = "";
    response.setEncoding("utf8");
    response.on("data", (chunk) => {
      body += chunk;
    });
    response.on("end", () => {
      resolve(body);
    });
    response.on("error", reject);
  });
}

async function fetchReleasePage(page: number): Promise<GitHubRelease[]> {
  const response = await downloadFrom(
    `${yarnReleasesApiUrl}${page}`,
    undefined,
    {
      accept: "application/vnd.github+json",
    },
  );
  const statusCode = response.statusCode ?? 0;
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      `Unable to query Yarn releases from GitHub. HTTP ${statusCode}.`,
    );
  }

  return JSON.parse(await readResponseBody(response)) as GitHubRelease[];
}

async function getVersionIndex(): Promise<YarnVersionIndex> {
  const yarnVersions: YarnVersionIndex = {};
  let page = 1;

  while (true) {
    const releases = await fetchReleasePage(page);

    if (!releases.length) {
      break;
    }

    for (const release of releases) {
      const version = toolLib.cleanVersion(release.tag_name);
      if (!version) {
        continue;
      }

      const tarball = release.assets.find(
        (asset) => asset.name === `yarn-v${version}.tar.gz`,
      );
      if (!tarball) {
        continue;
      }

      yarnVersions[version] = {
        uri: tarball.browser_download_url,
        isPrerelease: release.prerelease,
      };
    }

    if (releases.length < 100) {
      break;
    }

    page += 1;
  }

  fs.writeFileSync(yarnVersionsFile, JSON.stringify(yarnVersions, null, 2), {
    encoding: "utf8",
  });

  return yarnVersions;
}

async function queryLatestMatch(
  versionSpec: string,
  includePrerelease: boolean,
): Promise<{ version: string; url: string } | undefined> {
  const yarnVersions = await getVersionIndex();
  let versionsCodes = Object.keys(yarnVersions);
  if (!includePrerelease) {
    versionsCodes = versionsCodes.filter((v) => !yarnVersions[v].isPrerelease);
  }

  const version: string = toolLib.evaluateVersions(versionsCodes, versionSpec);

  if (!version) {
    return undefined;
  }

  return { version: version, url: yarnVersions[version].uri };
}

async function downloadYarn(version: {
  version: string;
  url: string;
}): Promise<string> {
  const cleanVersion = toolLib.cleanVersion(version.version);

  const downloadPath: string = path.join(
    getTempPath(),
    `yarn-${cleanVersion}.tar.gz`,
  );
  await downloadFile(version.url, downloadPath);

  const detarLocation = path.join(getTempPath(), "yarn-output");
  fs.emptyDirSync(detarLocation);
  await detar(downloadPath, detarLocation);

  return await toolLib.cacheDir(detarLocation, "yarn", cleanVersion);
}

async function getYarn(
  versionSpec: string,
  checkLatest: boolean,
  includePrerelease: boolean,
): Promise<void> {
  if (shouldUseCorepackForVersionSpec(versionSpec)) {
    await getModernYarn(versionSpec);
    return;
  }

  if (toolLib.isExplicitVersion(versionSpec)) {
    checkLatest = false; // check latest doesn't make sense when explicit version
  }

  // check cache
  let toolPath: string | undefined;
  if (!checkLatest) {
    toolPath = toolLib.findLocalTool("yarn", versionSpec);
  }

  if (!toolPath) {
    let version: { version: string; url: string } | undefined;
    if (toolLib.isExplicitVersion(versionSpec)) {
      // version to download
      version = await queryLatestMatch(versionSpec, true);
    } else {
      // query nodejs.org for a matching version
      version = await queryLatestMatch(versionSpec, includePrerelease);

      if (!version) {
        throw new Error(`Unable to find Yarn version '${versionSpec}'.`);
      }

      tl.debug("Matched version: " + version.version);

      // check cache
      toolPath = toolLib.findLocalTool("yarn", version.version);
    }

    if (!version) {
      throw new Error(`Unable to find Yarn version '${versionSpec}'.`);
    }

    if (!toolPath) {
      tl.debug("Downloading tarball: " + version.url);
      // download, extract, cache
      toolPath = await downloadYarn(version);
    }

    toolLib.prependPath(toolPath);
  }

  //
  // a tool installer initimately knows details about the layout of that tool
  // for example, node binary is in the bin folder after the extract on Mac/Linux.
  // layouts could change by version, by platform etc... but that's the tool installers job
  //

  if (!toolPath) {
    throw new Error(`Unable to resolve Yarn version '${versionSpec}'.`);
  }

  const matches = tl.findMatch(toolPath, ["**/bin/yarn.cmd"]);

  if (matches.length) {
    toolPath = path.dirname(matches[0]);
  } else {
    throw new Error("Yarn package layout unexpected.");
  }

  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  //

  toolLib.prependPath(toolPath);
}

async function run(): Promise<void> {
  try {
    const versionSpec = tl.getInput("versionSpec", true);
    if (!versionSpec) {
      throw new Error("The versionSpec input is required.");
    }

    const checkLatest: boolean = tl.getBoolInput("checkLatest", false);
    const includePrerelease: boolean = tl.getBoolInput(
      "includePrerelease",
      false,
    );

    await getYarn(versionSpec, checkLatest, includePrerelease);
  } catch (error) {
    tl.setResult(
      tl.TaskResult.Failed,
      error instanceof Error ? error.message : String(error),
    );
  }
}

if (require.main === module) {
  run();
}
