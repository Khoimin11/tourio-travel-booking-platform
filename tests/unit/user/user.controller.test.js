const Account = require("../../../models/account-admin.model");
const Role = require("../../../models/role.model");
const bcrypt = require("bcryptjs");
const controller = require("../../../controllers/admin/user.controller");
const { request, response, query } = require("../../mocks/http.mock");
const createUserMock = require("../../mocks/user.mock");
const body = createUserMock();
beforeEach(() => {
  Account.findOne.mockResolvedValueOnce({ id: "target-id" }).mockResolvedValue(null);
  Role.findOne.mockResolvedValue({ id: "role-id" });
  Account.updateOne.mockResolvedValue({ matchedCount: 1 });
});
test("user list combines status/date/search filters and clamps the page", async () => {
  Account.countDocuments.mockResolvedValue(10); const result = query([]); Account.find.mockReturnValue(result); const res = response();
  await controller.list(request({ query: { status: "active", startDate: "2026-10-01", endDate: "2026-10-06", keyword: "User.1", page: "99" } }), res);
  const find = Account.countDocuments.mock.calls[0][0];
  expect(find.status).toBe("active"); expect(find.createdAt.$gte).toBeInstanceOf(Date); expect(find.createdAt.$lte).toBeInstanceOf(Date);
  expect(find.$or[0].fullName.test("User.1")).toBe(true); expect(find.$or[0].fullName.test("UserX1")).toBe(false);
  expect(result.skip).toHaveBeenCalledWith(9); expect(res.render.mock.calls[0][1].pagination.currentPage).toBe(2);
});
test("empty password and no upload preserve existing password/avatar", async () => {
  await controller.editPatch(request({ body: { ...body, password: "", avatar: "null" } }), response());
  const update = Account.updateOne.mock.calls[0][1].$set;
  expect(update).not.toHaveProperty("password"); expect(update).not.toHaveProperty("avatar"); expect(update.updatedBy).toBe("admin-id");
});
test("new password is hashed and new avatar is saved", async () => {
  await controller.editPatch(request({ body: { ...body, password: "StrongPass1!" }, file: { path: "new-avatar" } }), response());
  const update = Account.updateOne.mock.calls[0][1].$set;
  expect(await bcrypt.compare("StrongPass1!", update.password)).toBe(true); expect(update.avatar).toBe("new-avatar");
});
test("duplicate email is rejected", async () => {
  Account.findOne.mockReset().mockResolvedValueOnce({ id: "target-id" }).mockResolvedValueOnce({ id: "other-id" });
  const res = response(); await controller.editPatch(request({ body }), res);
  expect(Account.findOne).toHaveBeenCalledWith({ _id: { $ne: "target-id" }, email: body.email });
  expect(Account.updateOne).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
test("user edit cannot inject a deletion flag", async () => {
  const invalid = { deleted: true };
  await controller.editPatch(request({ body: { ...body, ...invalid } }), response()); expect(Account.updateOne).not.toHaveBeenCalled();
});
test("cannot deactivate the logged-in account", async () => {
  await controller.editPatch(request({ account: { id: "target-id" }, body: { ...body, status: "inactive" } }), response());
  expect(Account.updateOne).not.toHaveBeenCalled();
});
test("cannot delete the logged-in account", async () => {
  await controller.deletePatch(request({ account: { id: "target-id" } }), response()); expect(Account.updateOne).not.toHaveBeenCalled();
});
test("delete is soft and disables the account", async () => {
  await controller.deletePatch(request(), response());
  expect(Account.updateOne).toHaveBeenCalledWith({ _id: "target-id", deleted: false }, { $set: expect.objectContaining({ deleted: true, status: "inactive", deletedBy: "admin-id", deletedAt: expect.any(Date) }) });
});
