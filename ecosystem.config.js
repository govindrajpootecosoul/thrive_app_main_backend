module.exports = {
  apps: [{
    name: 'thrive-app',
    script: 'server.js',
    instances: 4, // Number of instances to run for load balancing
    exec_mode: 'cluster', // Use cluster mode for load balancing
    env: {
      NODE_ENV: 'development',
      PORT: 3100
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3100
    },
    // Restart policy
    autorestart: true,
    watch: false,
    max_memory_restart: '1G', // Restart if memory exceeds 1GB
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
