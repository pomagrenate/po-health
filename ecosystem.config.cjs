module.exports = {
  apps: [
    {
      name: "po-health-backend",
      script: "services/server.py",
      cwd: "/home/vinhle/po-health",
      interpreter: "/home/vinhle/po-health/.venv/bin/python",
      env: {
        DB_PATH: "/home/vinhle/po-health/pomaidb",
        DOCKING_DB_PATH: "/home/vinhle/po-health/cheesepath",
      }
    },
    {
      name: "po-health-frontend",
      script: "npm",
      args: "start",
      cwd: "/home/vinhle/po-health",
      env: {
        PORT: "3000"
      }
    }
  ]
};
