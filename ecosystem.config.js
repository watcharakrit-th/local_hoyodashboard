// pm2 process definition for running the dashboard as a persistent local
// service. Points directly at Next's binary rather than wrapping `npm start`
// to avoid npm.cmd/pm2 quirks on Windows.
//
// Usage:
//   npm run build
//   pm2 start ecosystem.config.js
//   pm2 save
//
// After code changes: npm run build && pm2 restart hoyo-dashboard
module.exports = {
  apps: [
    {
      name: "hoyo-dashboard",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 6767",
      env: { NODE_ENV: "production" },
      autorestart: true,
      watch: false,
    },
  ],
};
