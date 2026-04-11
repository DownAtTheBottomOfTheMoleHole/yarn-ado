# yarn-ado

This extension is maintained as a hard fork of the original Geek Learning Yarn tasks so they remain usable on current Azure DevOps agents and modern Node.js runtimes.

## Included Tasks

- **YarnInstaller**: installs a requested Yarn version on the agent
- **Yarn**: runs Yarn commands and supports authenticated registries

## Quick Start

Add the tasks to any Azure Pipelines YAML or classic pipeline:

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

## Visual Configuration

![add-task](Screenshots/Add-Tasks.png)

You can also configure authenticated feeds and `.npmrc`-based registries directly in the task settings.

![Custom Registries](Screenshots/Custom-Registries.png)

## Compatibility

- `YarnInstaller` requires newer agent features and is not intended for TFS 2015.
- The task contract is intentionally kept close to the original extension to reduce migration risk for existing pipelines.

## Resources

- [Repository](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado)
- [Issues](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado/issues)
- [Releases](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado/releases)
- [Root documentation](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado#readme)
