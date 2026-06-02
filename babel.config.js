module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [
      [require('expo/internal/babel-preset'), { reanimated: !isTest }],
    ],
  };
};
