/** PM2 process file: pm2 start ecosystem.config.js --env production */
module.exports = {
  apps: [
    {
      name: 'actuarialfactor-api',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      env_production: { NODE_ENV: 'production' },
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      time: true,
    },
  ],
};
