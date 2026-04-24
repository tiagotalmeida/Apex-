#!/usr/bin/env bash
set -e

export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-arm64
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0

MODE=${1:-debug}   # debug | release

echo "▶ Building web app..."
npm run build

echo "▶ Syncing Capacitor assets..."
cap sync android

echo "▶ Building Android APK ($MODE)..."
cd android
./gradlew "assemble${MODE^}" --no-daemon

APK="app/build/outputs/apk/$MODE/app-$MODE.apk"
echo ""
echo "✅ Done: $APK ($(du -sh "$APK" | cut -f1))"
