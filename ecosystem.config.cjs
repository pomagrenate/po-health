module.exports = {
  apps: [
    {
      name: "po-health-backend",
      script: "uvicorn",
      args: "services.server:app --host 127.0.0.1 --port 8000",
      cwd: "/home/vinhle/pomaieco/po-health",
      interpreter: "python3",
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
