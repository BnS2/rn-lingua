const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const { withVarlockMetroConfig } = require("@varlock/expo-integration/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withVarlockMetroConfig(withNativewind(config));
