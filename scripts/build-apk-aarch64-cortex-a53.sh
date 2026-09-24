#!/bin/sh
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Nikitid

# Build the official ARMv8/AArch64 Cortex-A53 preset.  The target, rather than
# CPU name alone, selects the SDK because kernel modules are target-specific.
set -eu

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
. "$root/apk-feed.env"

release="${1:-$OPENWRT_APK_VERSION}"
target="${2:-mediatek/filogic}"
expected_arch='aarch64_cortex-a53'

case "$release" in 25.12.*) ;; *)
	printf '%s\n' 'ARMv8 preset supports only OpenWrt 25.12.x' >&2
	exit 2
esac

case "$target" in mediatek/filogic) ;; *)
	printf '%s\n' 'ARMv8 Cortex-A53 preset requires mediatek/filogic' >&2
	exit 2
esac

"$root/scripts/build-apk-target.sh" "$release" "$target"
output="$root/dist/apk/$release-mediatek-filogic-$expected_arch"
[ -d "$output" ] && find "$output" -type f -name '*.apk' -print -quit | grep -q . || {
	printf '%s\n' "expected $expected_arch APK was not produced" >&2
	exit 1
}
printf '%s\n' "ARMv8 APK: $output"
