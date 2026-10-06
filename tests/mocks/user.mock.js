module.exports = overrides => ({
  fullName: "Test User", email: "user@example.com", phone: "0377000000",
  role: "role-id", positionCompany: "Manager", status: "active",
  ...overrides
});
