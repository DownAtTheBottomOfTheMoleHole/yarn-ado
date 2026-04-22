#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   BuildScripts/setup-github-actions-secrets.sh [owner/repo] [env-file]
#
# Defaults:
#   repo     -> parsed from git origin remote
#   env-file -> .github/actions-secrets.env

repo="${1:-}"
env_file="${2:-.github/actions-secrets.env}"

if [[ -z "$repo" ]]; then
  origin_url="$(git remote get-url origin)"
  # Supports https://github.com/owner/repo(.git) and git@github.com:owner/repo(.git)
  repo="${origin_url#https://github.com/}"
  repo="${repo#git@github.com:}"
  repo="${repo%.git}"
fi

if [[ ! -f "$env_file" ]]; then
  echo "Missing env file: $env_file"
  echo "Create it from .github/actions-secrets.example.env and fill required values."
  exit 1
fi

# shellcheck disable=SC1090
source "$env_file"

missing=0
for name in AZURE_DEVOPS_EXT_PAT AZURE_DEVOPS_ORGS; do
  value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Required value missing in $env_file: $name"
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "Setting secrets on $repo"
printf '%s' "$AZURE_DEVOPS_EXT_PAT" | gh secret set AZURE_DEVOPS_EXT_PAT --repo "$repo"
printf '%s' "$AZURE_DEVOPS_ORGS" | gh secret set AZURE_DEVOPS_ORGS --repo "$repo"

if [[ -n "${PAT:-}" ]]; then
  printf '%s' "$PAT" | gh secret set PAT --repo "$repo"
  echo "Optional secret set: PAT"
fi

echo "Done."
