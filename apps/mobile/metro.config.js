const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Allow SVG files to be bundled as static assets (for expo-image)
config.resolver.assetExts = [...config.resolver.assetExts, 'svg'];

// Watch the entire monorepo so Metro can resolve shared packages
config.watchFolders = [monorepoRoot];

// Look for modules in both the app and the root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
