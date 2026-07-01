const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve socket.io-client's package exports
config.resolver.unstable_enablePackageExports = true;
// Use the "react-native" condition so socket.io picks the right build
config.resolver.unstable_conditionNames = [
  "react-native",
  "require",
  "default",
];

module.exports = withNativeWind(config, { input: "./src/global.css" });
