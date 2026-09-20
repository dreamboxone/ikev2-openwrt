#!/bin/sh
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Nikitid
set -eu

project="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT INT TERM
mkdir -p "$test_root/root/usr/libexec/ikev2-manager.d" "$test_root/in"
cp "$project/ikev2-manager-runtime/lib/actions.sh" \
	"$test_root/root/usr/libexec/ikev2-manager.d/actions.sh"
manager="$project/luci-ikev2-manager/ikev2-manager.sh"
run_import() {
	IKEV2_ROOT="$test_root/root" IKEV2_MATERIAL_INPUT_DIR="$test_root/in" \
		IKEV2_UCI_BIN=/bin/true \
		sh "$manager" client-material-import "$1" "$2"
}

openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
	-subj '/CN=upload-test' -keyout "$test_root/key.pem" \
	-out "$test_root/cert.pem" >/dev/null 2>&1
cp "$test_root/cert.pem" "$test_root/in/ikev2-manager-material-certvalid01.in"
cert_path="$(run_import cert certvalid01 | sed -n 's/^path=//p')"
[ "$cert_path" = "$test_root/root/etc/ikev2-manager/client-imported-cert.pem" ]
[ ! -e "$test_root/in/ikev2-manager-material-certvalid01.in" ]
openssl x509 -in "$cert_path" -noout >/dev/null

cp "$test_root/key.pem" "$test_root/in/ikev2-manager-material-keyvalid01.in"
key_path="$(run_import key keyvalid01 | sed -n 's/^path=//p')"
[ "$key_path" = "$test_root/root/etc/ikev2-manager/client-imported-key.pem" ]
[ ! -e "$test_root/in/ikev2-manager-material-keyvalid01.in" ]
[ "$(stat -c %a "$key_path")" = 600 ]

printf '%s\n' 'not a certificate' >"$test_root/in/ikev2-manager-material-certbad01.in"
if run_import cert certbad01 >"$test_root/out" 2>"$test_root/err"; then
	echo 'invalid certificate was accepted' >&2
	exit 1
fi
openssl x509 -in "$cert_path" -noout >/dev/null
[ ! -e "$test_root/in/ikev2-manager-material-certbad01.in" ]

printf 'client material upload tests OK\n'
