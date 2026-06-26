module.exports = {
  apps: [
    {
      name: "po-health-backend",
      script: "services/server.py",
      cwd: "/home/vinhle/po-health",
      interpreter: "python3",
      env: {
        DB_PATH: "/home/vinhle/po-health/pomaidb",
        DOCKING_DB_PATH: "/home/vinhle/po-health/cheesepath",
      }
    },
    {
      name: "po-health-frontend",
      script: "node_modules/.bin/next",
      args: "start -p 9000",
      cwd: "/home/vinhle/po-health",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
