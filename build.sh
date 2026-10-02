#!/usr/bin/env bash
# Build the extension zip uploaded to extensions.gnome.org.
# This is the single list of shipped files: install.sh and the release workflow both use it.

set -euo pipefail

UUID=twingate-status@guillaume-gambs.github.io
ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$ROOT/build"
ZIP="$ROOT/$UUID.zip"

for tool in msgfmt zip; do
    if ! command -v "$tool" &> /dev/null; then
        echo "Error: $tool is not installed" >&2
        exit 1
    fi
done

rm -rf "$BUILD_DIR" "$ZIP"
mkdir -p "$BUILD_DIR/schemas"

cd "$ROOT"
cp -r extension.js prefs.js metadata.json stylesheet.css LICENSE icons "$BUILD_DIR/"
# Only the source schema is shipped, EGO compiles it (EGO-P-006)
cp schemas/*.gschema.xml "$BUILD_DIR/schemas/"

for po in po/*.po; do
    lang="$(basename "$po" .po)"
    mkdir -p "$BUILD_DIR/locale/$lang/LC_MESSAGES"
    msgfmt --check -o "$BUILD_DIR/locale/$lang/LC_MESSAGES/$UUID.mo" "$po"
done

(cd "$BUILD_DIR" && zip -qr "$ZIP" .)
echo "Built $ZIP"
