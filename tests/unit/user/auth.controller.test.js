const Account = require("../../../models/account-admin.model");
const Role = require("../../../models/role.model");
const Order = require("../../../models/order.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const controller = require("../../../controllers/admin/account.controller");
const auth = require("../../../middlewares/admin/auth.middleware");
const { request, response, query } = require("../../mocks/http.mock");
test("login rejects an incorrect password", async () => {
  const password = await bcrypt.hash("StrongPass1!", 4);
  Account.findOne.mockResolvedValue({ id: "user-id", email: "user@example.test", password, status: "active" });
  const res = response(); await controller.loginPost(request({ body: { email: "user@example.test", password: "wrong" } }), res);
  expect(res.cookie).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
test("valid login sets a signed httpOnly cookie and excludes deleted accounts", async () => {
  Account.findOne.mockResolvedValue({ id: "user-id", email: "user@example.test", password: await bcrypt.hash("StrongPass1!", 4), status: "active" });
  const res = response(); await controller.loginPost(request({ body: { email: "user@example.test", password: "StrongPass1!", rememberPassword: true } }), res);
  expect(Account.findOne).toHaveBeenCalledWith({ email: "user@example.test", deleted: false });
  const [, token, options] = res.cookie.mock.calls[0]; expect(jwt.verify(token, process.env.JWT_SECRET).id).toBe("user-id");
  expect(options).toMatchObject({ httpOnly: true, sameSite: "strict", maxAge: 30 * 24 * 60 * 60 * 1000 });
});
test("registration rejects an email already in use", async () => {
  Account.findOne.mockResolvedValue({ id: "existing" }); const res = response();
  await controller.registerPost(request({ body: { fullName: "Test User", email: "user@example.com", password: "StrongPass1!" } }), res);
  expect(Account.save).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
test("registration hashes the password and starts with initial status", async () => {
  Account.findOne.mockResolvedValue(null); Account.save.mockResolvedValue(); const res = response();
  await controller.registerPost(request({ body: { fullName: "Test User", email: "user@example.com", password: "StrongPass1!" } }), res);
  const account = Account.mock.instances[0];
  expect(account.status).toBe("initial"); expect(await bcrypt.compare("StrongPass1!", account.password)).toBe(true);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "success" }));
});
test("deleted account cannot keep an existing session", async () => {
  const token = jwt.sign({ id: "user-id", email: "user@example.test" }, process.env.JWT_SECRET);
  Account.findOne.mockResolvedValue(null); const next = jest.fn(), res = response();
  await auth.verifyToken(request({ cookies: { token } }), res, next);
  expect(Account.findOne).toHaveBeenCalledWith(expect.objectContaining({ deleted: false }));
  expect(next).not.toHaveBeenCalled(); expect(res.clearCookie).toHaveBeenCalledWith("token");
});
test("valid session exposes role permissions and proceeds", async () => {
  const token = jwt.sign({ id: "user-id", email: "user@example.test" }, process.env.JWT_SECRET);
  Account.findOne.mockResolvedValue({ id: "user-id", role: "role-id", orderNotificationSeenAt: new Date() });
  Role.findOne.mockResolvedValue({ name: "Admin", permissions: ["tour-view"] }); Order.countDocuments.mockResolvedValue(0); Order.find.mockReturnValue(query([]));
  const next = jest.fn(), res = response(), req = request({ cookies: { token } }); await auth.verifyToken(req, res, next);
  expect(next).toHaveBeenCalled(); expect(req.permissions).toEqual(["tour-view"]); expect(res.locals.account.roleName).toBe("Admin");
});
