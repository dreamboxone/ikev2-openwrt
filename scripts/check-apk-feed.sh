#!/bin/sh
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Nikitid

set -eu

fail() {
	printf 'check-apk-feed: %s\n' "$*" >&2
	exit 1
}

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
release_workflow="$root/.github/workflows/release.yml"

# APKs are deliberate GitHub Release assets, not an external package feed.
# The owner has chosen unsigned packages; operators install only a verified,
# target-matched release file with apk add --allow-untrusted.
grep -Fq './scripts/build-apk.sh' "$release_workflow" ||
	fail 'release workflow does not build the APK'
grep -Fq 'dist/apk/*' "$release_workflow" ||
	fail 'release workflow does not publish the APK asset'
grep -Fq 'Build unsigned OpenWrt 25.12 APK' "$release_workflow" ||
	fail 'release workflow must explicitly build an unsigned APK'
if grep -Fq 'OPENWRT_APK_SIGNING_KEY' "$release_workflow"; then
	fail 'release workflow must not require an APK signing key'
fi
if grep -Fq 'openwrt-feed' "$release_workflow"; then
	fail 'release workflow must not publish through an external APK feed'
fi

printf 'check-apk-feed OK\n'
