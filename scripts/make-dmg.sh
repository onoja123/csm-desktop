#!/bin/sh
# Wraps the built CSM.app in a plain disk image without Finder scripting.
set -e
cd "$(dirname "$0")/.."
APP=src-tauri/target/release/bundle/macos/CSM.app
VERSION=$(node -p "require('./package.json').version")
OUT=src-tauri/target/release/bundle/CSM_${VERSION}.dmg
[ -d "$APP" ] || { echo "build the app first: npm run app:build" >&2; exit 1; }
rm -f "$OUT"
hdiutil create -volname CSM -srcfolder "$APP" -ov -format UDZO "$OUT" >/dev/null
echo "$OUT"
