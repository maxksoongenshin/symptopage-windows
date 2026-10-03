module.exports = {
  testDir: "./tests",
  testMatch: "app.spec.cjs",
  timeout: 60000,
  workers: 1,
  use: { trace: "retain-on-failure" },
  reporter: "list",
};
