# yarn-ado

> This repository is maintained as a hard fork of the original Geek Learning Yarn extension so it can continue evolving with current Azure DevOps and Node.js runtimes.

Run Yarn in Azure DevOps Pipelines with two tasks:

- `YarnInstaller`: download and cache a requested Yarn version on the agent
- `Yarn`: execute Yarn commands with optional authenticated registry support

## Installation

Install the extension from your Azure DevOps organization or from a packaged `.vsix`, then add the tasks to a pipeline.

## Quick Start

```yaml
steps:
  - task: YarnInstaller@1
    displayName: Use Yarn 4.x
    inputs:
      versionSpec: 4.x

  - task: Yarn@1
    displayName: Install dependencies
    inputs:
      arguments: install --frozen-lockfile
```

## Included Tasks

| Task | Purpose |
| --- | --- |
| `YarnInstaller` | Installs a requested Yarn version and adds it to the PATH |
| `Yarn` | Runs Yarn commands and can inject credentials for Azure Artifacts or external npm registries |

## Registry Support

The `Yarn` task supports two authentication models:

1. Use a checked-in `.npmrc` file from your repository.
2. Select an Azure Artifacts feed or external npm service connection in the task UI.

## Compatibility And Known Limitations

- `YarnInstaller` depends on newer agent capabilities and is not intended for very old on-prem Azure DevOps Server or TFS deployments.
- The task surface is intentionally kept close to the original extension to preserve pipeline compatibility.
- If you rely on marketplace publishing, extension identity values such as publisher and extension id still need to match your target marketplace account.

## Development

```bash
npm install
npm run build
npm test
npm run package -- --version <version>
```

The packaging flow generates development, preview, and production extension artifacts from the source files in `Tasks/` and `Extension/`.

## Contributing

See [Contributing.md](Contributing.md) for contribution and issue-reporting guidance.

## Upstream Attribution

This project started from [geeklearningio/gl-vsts-tasks-yarn](https://github.com/geeklearningio/gl-vsts-tasks-yarn) and is now maintained independently at [DownAtTheBottomOfTheMoleHole/yarn-ado](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado). It still benefits from ideas and code patterns originally derived from the Azure Pipelines task ecosystem.

## License

This repository remains available under the [MIT license](LICENSE.md).
