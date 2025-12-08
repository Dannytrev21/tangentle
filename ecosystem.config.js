/**
 * PM2 Ecosystem Configuration for Executive Brain
 *
 * Usage:
 *   npm start          - Start all services
 *   npm stop           - Stop all services
 *   npm run status     - Show service status
 *   npm run logs       - Show combined logs
 *   npm run restart    - Restart all services
 */

module.exports = {
  apps: [
    {
      name: 'brain-server',
      script: 'src/server.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Log configuration
      out_file: 'logs/server.log',
      error_file: 'logs/server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'brain-processor',
      script: 'src/processor.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      env: {
        NODE_ENV: 'production'
      },
      // Log configuration
      out_file: 'logs/processor.log',
      error_file: 'logs/processor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000
    }
  ]
};
