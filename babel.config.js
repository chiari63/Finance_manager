module.exports = function(api) {
  api.cache(true);
  
  const plugins = [
    [
      'module-resolver',
      {
        alias: {
          '@': './'
        }
      }
    ]
  ];
  
  // Remover console.log em produção
  if (process.env.NODE_ENV === 'production') {
    // Comentando esta linha para evitar erros de build
    // plugins.push('transform-remove-console');
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
}; 