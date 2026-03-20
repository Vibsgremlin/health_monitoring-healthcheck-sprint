module.exports = {
  testMatch: ["**/tests/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "/airflow_scan/", "/repo_scan/"],
  modulePathIgnorePatterns: ["/airflow_scan/", "/repo_scan/"]
};
