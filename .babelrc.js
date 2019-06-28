
module.exports = function(api) {
  api.cache.using(() => 'v1');

  return {
    presets: [
      ['@babel/preset-env'],
    ],
    plugins: [
      '@babel/plugin-proposal-object-rest-spread',
    ],
  };
};
