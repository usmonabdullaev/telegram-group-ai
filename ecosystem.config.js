module.exports = {
  apps: [
    {
      name: 'telegram-group-ai',

      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',

      autorestart: true,
      watch: false,

      max_memory_restart: '500M',

      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
