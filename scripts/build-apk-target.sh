#!/bin/sh
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Nikitid

# Build an unsigned APK for one exact official OpenWrt 25.12 target.  The
# target is discovered from the official checksum index, so callers never
# guess a toolchain filename, package architecture or checksum.

set -eu

fail() {
	printf '%s\n' "build-apk-target: $*" >&2
	exit 1
}

root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
release="${1:-}"
target="${2:-}"

case "$release" in
	25.12.[0-9]*) ;;
	*) fail 'usage: build-apk-target.sh 25.12.x target/subtarget' ;;
esac
case "$target" in
	*[!a-zA-Z0-9_/-]*|*//*|/*|*/) fail 'target must be target/subtarget, for example ipq40xx/chromium' ;;
	*/*) ;;
	*) fail 'target must be target/subtarget, for example ipq40xx/chromium' ;;
esac
target_family="${target%/*}"
target_subtarget="${target#*/}"
case "$target_subtarget" in
	*/*) fail 'target must contain exactly one slash' ;;
esac

safe_target="${target%/*}-${target#*/}"
base_url="https://downloads.openwrt.org/releases/$release/targets/$target"
tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT HUP INT TERM

for command in curl awk sha256sum tar zstd grep cut sed make; do
	command -v "$command" >/dev/null 2>&1 || fail "required command is missing: $command"
done

curl --fail --location --silent --show-error "$base_url/sha256sums" \
	--output "$tmp/sha256sums"
sdk_line="$(awk -v prefix="openwrt-sdk-$release-$safe_target" '
	$2 ~ ("^\\*" prefix "_.*\\.tar\\.zst$") { print $1 " " substr($2, 2); exit }
' "$tmp/sha256sums")"
[ -n "$sdk_line" ] || fail "official SDK not found for $release $target"
sdk_sha="${sdk_line%% *}"
sdk_archive="${sdk_line##* }"

curl --fail --location --silent --show-error "$base_url/$sdk_archive" \
	--output "$tmp/$sdk_archive"
printf '%s  %s\n' "$sdk_sha" "$tmp/$sdk_archive" | sha256sum --check
mkdir -p "$tmp/sdk"
tar --use-compress-program=unzstd -xf "$tmp/$sdk_archive" -C "$tmp/sdk"
sdk="$tmp/sdk/${sdk_archive%.tar.zst}"
make -C "$sdk" defconfig
[ -r "$sdk/.config" ] || fail 'SDK target configuration is missing'
architecture="$(sed -n 's/^CONFIG_TARGET_ARCH_PACKAGES="\(.*\)"$/\1/p' "$sdk/.config")"
[ -n "$architecture" ] || fail 'SDK package architecture is missing'

output="$root/dist/apk/$release-$safe_target-$architecture"
OPENWRT_SDK_DIR="$sdk" \
OPENWRT_APK_VERSION_OVERRIDE="$release" \
OPENWRT_APK_TARGET_OVERRIDE="$target" \
OPENWRT_APK_ARCH_OVERRIDE="$architecture" \
OPENWRT_APK_SDK_ARCHIVE_OVERRIDE="$sdk_archive" \
OPENWRT_APK_SDK_SHA256_OVERRIDE="$sdk_sha" \
OPENWRT_APK_OUTPUT_DIR="$output" \
	"$root/scripts/build-apk.sh"

printf '%s\n' "APK for $release $target ($architecture): $output"
