# Versioning

`yarn-ado` uses [GitVersion](https://gitversion.net/) for automated semantic versioning.

## Branch Strategy

- `main` : stable release branch
- `dev` and `develop`: integration branches for upcoming changes
- `feature/*`: minor-version work
- `fix/*`, `hotfix/*`, `bug/*`: patch-version work
- `release/*`: stabilization branches
- `docs/*` and `documentation/*`: documentation-only work
- `renovate/*`: dependency maintenance

## Commit Message Incrementing

- `feat:` triggers a minor bump
- `fix:` triggers a patch bump
- `BREAKING CHANGE:` or `+semver: major` triggers a major bump
- `+semver: none` or `+semver: skip` disables bumping for a commit

## Workflow Usage

- PR builds generate a four-part private extension version using `Major.Minor.Patch.EpochMinutes`
- Release builds package the production extension using `MajorMinorPatch`

See [GitVersion.yml](../GitVersion.yml) and the workflows in `.github/workflows/` for the active configuration.
