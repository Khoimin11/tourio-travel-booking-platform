exports.request = overrides => ({
  query: {}, params: { id: "target-id" }, body: {},
  account: { id: "admin-id" }, permissions: [], flash: jest.fn(),
  protocol: "http", get: jest.fn(() => "localhost:3000"), headers: {},
  socket: { remoteAddress: "127.0.0.1" }, originalUrl: "/search",
  ...overrides
});
exports.response = () => {
  const res = { locals: {} };
  for(const method of ["json", "render", "redirect", "cookie", "clearCookie", "status"]) {
    res[method] = jest.fn(() => res);
  }
  return res;
};
exports.query = data => {
  const result = { then: (resolve, reject) => Promise.resolve(data).then(resolve, reject) };
  for(const method of ["sort", "limit", "skip", "select"]) result[method] = jest.fn(() => result);
  return result;
};
