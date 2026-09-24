const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow SVG files to be bundled as static assets (for expo-image)
config.resolver.assetExts = [...config.resolver.assetExts, 'svg'];

module.exports = config;
