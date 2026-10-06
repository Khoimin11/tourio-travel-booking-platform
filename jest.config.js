module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"],
  transform: {},
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    "helpers/{pagination,category,vnpay}.helper.js",
    "controllers/admin/{tour,user,category,order,account}.controller.js",
    "controllers/client/{order,cart,search,category,contact}.controller.js",
    "middlewares/admin/auth.middleware.js"
  ],
  coverageReporters: ["text", "html", "lcov"]
};
