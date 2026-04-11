# yarn-ado

Run Yarn Classic and modern Yarn 2+ workflows in Azure DevOps pipelines.

This extension is maintained as an independent hard fork of the original Geek Learning task set. The goal of the fork is to keep Yarn relevant in current Azure DevOps environments for both Yarn Classic and Yarn 2+ and later.

## Included Tasks

- **YarnInstaller**: installs official Yarn Classic releases on the agent
- **Yarn**: runs Yarn commands and supports authenticated registries

## Quick Start

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

If your repository uses Corepack or Yarn Berry, install Yarn separately and then call `Yarn@1`.

The intended approach for Yarn 2+ and later is to provision Yarn outside the task, then use `Yarn@1` as the pipeline execution wrapper.

## Visual Configuration

![Task Configuration](Screenshots/Configure-Yarn.png)

![Custom Registries](Screenshots/Custom-Registries.png)

## Resources

- [Repository](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado)
- [Issues](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado/issues)
- [Releases](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado/releases)
- [Security Policy](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado/blob/main/SECURITY.md)
