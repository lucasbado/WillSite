module.exports = {
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