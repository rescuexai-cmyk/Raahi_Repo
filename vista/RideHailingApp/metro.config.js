const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add platform-specific extensions
config.resolver.platforms = ['native', 'web', 'ios', 'android'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.tsx', 'web.ts', 'web.js'];

// Configure alias for web platform
config.resolver.alias = {
  ...(config.resolver.alias || {}),
};

// Handle react-native-maps for web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;