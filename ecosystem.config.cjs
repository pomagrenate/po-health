module.exports = {
  apps: [
    {
      name: "po-health-backend",
      script: "/home/vinhle/po-health/services/server.py",
      cwd: "/home/vinhle/po-health",
      interpreter: "python3",
      env: {
        DB_PATH: "/home/vinhle/po-health/pomaidb",
        DOCKING_DB_PATH: "/home/vinhle/po-health/cheesepath",
      }
    },
    {
      name: "po-health-frontend",
      script: "npm",
      args: "run start -- -p 9000",
      cwd: "/home/vinhle/po-health",
      interpreter: "none",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
