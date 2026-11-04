module.exports = {
  webpack: {
    configure: (config) => {
      // html5-qrcode publica mapas apontando para arquivos TS ausentes no pacote.
      // Preserva os mapas da aplicação e evita processar apenas os mapas inválidos dessa dependência.
      for (const rule of config.module.rules) {
        if (rule.enforce === 'pre' && rule.loader?.includes('source-map-loader')) {
          rule.exclude = [rule.exclude, /node_modules[\\/]html5-qrcode[\\/]/].filter(Boolean);
        }
      }
      return config;
    },
  },
  style: {
    postcss: {
      mode: 'file',
    },
  },
  devServer: (devServerConfig) => {
    devServerConfig.allowedHosts = 'all'; // Força a string 'all' diretamente
    devServerConfig.historyApiFallback = true;
    devServerConfig.client = {
      overlay: false, // Evita que erros de overlay travem o browser no mobile
    };
    return devServerConfig;
  },
};
