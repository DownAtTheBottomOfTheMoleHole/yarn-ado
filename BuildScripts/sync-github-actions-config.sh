#!/usr/bin/env bash

set -euo pipefail

REPO="${1:-DownAtTheBottomOfTheMoleHole/yarn-ado}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_FILE="$ROOT_DIR/.github/actions-secrets.env"
VARIABLES_FILE="$ROOT_DIR/.github/actions-variables.env"

if ! command -v gh >/dev/null 2>&1; then
	echo "GitHub CLI (gh) is required."
	exit 1
fi

load_pairs() {
	local file="$1"
	[[ -f "$file" ]] || return 0

	while IFS='=' read -r key value; do
		[[ -z "${key}" ]] && continue
		[[ "${key}" =~ ^# ]] && continue
		printf '%s\t%s\n' "$key" "$value"
	done <"$file"
}

echo "Syncing GitHub Actions configuration to ${REPO}"

while IFS=$'\t' read -r key value; do
	[[ -z "$key" ]] && continue
	gh secret set "$key" -R "$REPO" -b "$value"
done < <(load_pairs "$SECRETS_FILE")

while IFS=$'\t' read -r key value; do
	[[ -z "$key" ]] && continue
	gh variable set "$key" -R "$REPO" -b "$value"
done < <(load_pairs "$VARIABLES_FILE")

echo "Done."