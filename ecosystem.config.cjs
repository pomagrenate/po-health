module.exports = {
  apps: [
    {
      name: "po-health-backend",
      script: "services/server.py",
      cwd: "/home/vinhle/pomaieco/po-health",
      interpreter: "/home/vinhle/pomaieco/po-health/.venv/bin/python",
      env: {
        DB_PATH: "/home/vinhle/pomaieco/po-health/pomaidb",
        DOCKING_DB_PATH: "/home/vinhle/pomaieco/po-health/cheesepath",
      }
    },
    {
      name: "po-health-frontend",
      script: "npm",
      args: "start",
      cwd: "/home/vinhle/pomaieco/po-health",
      env: {
        PORT: "3000"
      }
    }
  ]
};
