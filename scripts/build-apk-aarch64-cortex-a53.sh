#!/bin/sh
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Nikitid

# Build the official ARMv8/AArch64 Cortex-A53 preset.  The target, rather than
# CPU name alone, selects the SDK because kernel modules are target-specific.
set -eu

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
. "$root/apk-feed.env"
. "$root/release.env"

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
source_apk="$output/$PKG_NAME-$PKG_VERSION.apk"
[ -f "$source_apk" ] || {
	printf '%s\n' "expected package was not produced: $source_apk" >&2
	exit 1
}
release_apk="$root/dist/apk/$PKG_NAME-$PKG_VERSION-mediatek-filogic-$expected_arch.apk"
cp "$source_apk" "$release_apk"
checksum_file="$root/dist/apk/SHA256SUMS.apk"
checksum_tmp="$checksum_file.tmp.$$"
if [ -f "$checksum_file" ]; then
	awk -v name="$(basename "$release_apk")" '$2 != name' \
		"$checksum_file" >"$checksum_tmp"
else
	: >"$checksum_tmp"
fi
(
	cd "$root/dist/apk"
	sha256sum "$(basename "$release_apk")" >>"$checksum_tmp"
)
mv "$checksum_tmp" "$checksum_file"
printf '%s\n' "ARMv8 APK: $output"
printf '%s\n' "Release APK: $release_apk"
