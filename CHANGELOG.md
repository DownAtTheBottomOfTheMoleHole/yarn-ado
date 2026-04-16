# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitVersion-based PR validation and release workflows
- Release readiness documentation and GitHub Actions bootstrap templates
- Independent repository branding and Marketplace metadata for `yarn-ado`

### Changed

- Switched installer version resolution to official Yarn GitHub releases
- Updated documentation to describe Yarn Classic installer support accurately
- Prepared extension packaging for the initial independent release

### Security

- Documented secure secret handling through GitHub Actions secrets

## [1.0.0] - Initial Release

### Highlights

- `YarnInstaller` task for provisioning Yarn Classic on Azure DevOps agents
- `Yarn` task for executing Yarn commands in build and release pipelines
- Azure Artifacts and external npm registry authentication support
- Marketplace packaging for public, preview, and development extension variants

---

For more details, see the [commit history](https://github.com/DownAtTheBottomOfTheMoleHole/yarn-ado/commits/main).
