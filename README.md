# yarn-ado

[![Visual Studio Marketplace](https://img.shields.io/badge/Marketplace-yarn--ado-blue?logo=azuredevops)](https://marketplace.visualstudio.com/items?itemName=DownAtTheBottomOfTheMoleHole.yarn-ado)
[![PR Code Validation](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado/actions/workflows/pr-code-validation.yml/badge.svg)](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado/actions/workflows/pr-code-validation.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24-green)](https://nodejs.org/)

Azure DevOps extension for Yarn Classic and modern Yarn 2+ workflows in Azure Pipelines.

> This fork exists to keep Yarn usable in modern Azure DevOps pipelines for both Yarn Classic and Yarn 2+ and later workflows.

![Yarn Task Configuration](Extension/Screenshots/Configure-Yarn.png)

## Installation

1. Install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=DownAtTheBottomOfTheMoleHole.yarn-ado) once published, or upload a packaged `.vsix` to your Azure DevOps organization.
2. Add either `YarnInstaller` or `Yarn` to a pipeline.

## Quick Start

Use the built-in installer for Yarn Classic releases:

```yaml
steps:
  - task: YarnInstaller@1
    displayName: Use Yarn Classic 1.x
    inputs:
      versionSpec: 1.x

  - task: Yarn@1
    displayName: Install dependencies
    inputs:
      arguments: install --frozen-lockfile
```

Use the built-in installer for Yarn 2+ through Corepack:

```yaml
steps:
  - task: YarnInstaller@1
    displayName: Use Yarn 4.x
    inputs:
      versionSpec: 4.x

  - task: Yarn@1
    displayName: Install dependencies
    inputs:
      arguments: install --immutable
```

For Yarn 2+ and later, the task enables Corepack and activates the requested Yarn version on your behalf.

The intended model is:

1. Ask `YarnInstaller@1` for the required Yarn 2+ version.
2. Use `Yarn@1` as the execution task for install, build, test, and publish steps.

## Visual Configuration

Configure the tasks with the Azure DevOps task assistant:

![Add Task](Extension/Screenshots/Add-Tasks.png)

Registry and authentication options are available directly in the task UI:

![Custom Registries](Extension/Screenshots/Custom-Registries.png)

## Included Tasks

| Task | Purpose |
| --- | --- |
| `YarnInstaller` | Installs official Yarn Classic releases or activates Yarn 2+ through Corepack and adds Yarn to the agent PATH |
| `Yarn` | Runs Yarn commands and can inject credentials for Azure Artifacts or external npm registries |

## Compatibility

- This fork supports both Yarn Classic and modern Yarn 2+ and later usage patterns in Azure DevOps.
- `YarnInstaller` downloads official Yarn Classic releases from `yarnpkg/yarn` for 1.x requests.
- `YarnInstaller` enables Corepack and activates the requested version for Yarn 2+ and later requests.
- `Yarn@1` executes whatever `yarn` binary is available on the agent, including one provisioned separately by Corepack or a custom bootstrap step.
- `YarnInstaller` depends on newer agent features and is not intended for TFS 2015.

## Development

```bash
npm install
npm run build
npm test
npm run package -- --version <version>
```

The packaging flow generates development, preview, and production VSIX artifacts from the source files in `Tasks/` and `Extension/`.

## CI/CD Workflows

This repository includes GitHub Actions workflows inspired by `megalinter-ado`:

1. PR validation and optional private extension publishing in [.github/workflows/pr-code-validation.yml](.github/workflows/pr-code-validation.yml)
2. Public release packaging and publishing in [.github/workflows/release.yml](.github/workflows/release.yml)

Versioning is handled with [GitVersion](docs/VERSIONING.md).

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## Contributing

See [Contributing.md](Contributing.md) for contribution and issue-reporting guidance.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Upstream Attribution

This project started from [geeklearningio/gl-vsts-tasks-yarn](https://github.com/geeklearningio/gl-vsts-tasks-yarn) and is now maintained independently at [DownAtTheBottomOfTheMoleHole/yarn-ado](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado). It still benefits from ideas and code patterns originally derived from the Azure Pipelines task ecosystem.

## License

This repository remains available under the [MIT license](LICENSE.md).
