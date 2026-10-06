const Tour = require("../../../models/tour.model");
const Account = require("../../../models/account-admin.model");
const Category = require("../../../models/category.model");
const controller = require("../../../controllers/admin/tour.controller");
const { request, response, query } = require("../../mocks/http.mock");
test("automatic position is the highest existing position plus one", async () => {
  const last = { position: 25 };
  Tour.findOne.mockReturnValue(query(last)); Tour.save.mockResolvedValue();
  const req = request({ permissions: ["tour-create"], body: { position: "", locations: "[]", schedules: "[]" } });
  const res = response(); await controller.createPost(req, res);
  expect(Tour.mock.instances[0].position).toBe((last?.position || 0) + 1);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "success" }));
});
test("explicit position and uploaded images are preserved", async () => {
  Tour.save.mockResolvedValue();
  await controller.createPost(request({ permissions: ["tour-create"], body: { position: "7", locations: "[]", schedules: "[]" }, files: { avatar: [{ path: "avatar-url" }], images: [{ path: "image-url" }] } }), response());
  expect(Tour.findOne).not.toHaveBeenCalled();
  expect(Tour.mock.instances[0]).toMatchObject({ position: 7, avatar: "avatar-url", images: ["image-url"] });
});
test.each(["inactive", "delete"])("bulk %s updates only non-deleted tours", async option => {
  Tour.updateMany.mockResolvedValue({ matchedCount: 2 });
  const res = response();
  await controller.changeMultiPatch(request({ permissions: ["tour-edit", "tour-delete"], body: { option, ids: ["a", "b"] } }), res);
  expect(Tour.updateMany).toHaveBeenCalledWith({ _id: { $in: ["a", "b"] }, deleted: false }, expect.any(Object));
  const update = Tour.updateMany.mock.calls[0][1].$set;
  expect(update.updatedBy).toBe("admin-id");
  if(option === "delete") expect(update).toMatchObject({ deleted: true, deletedBy: "admin-id", deletedAt: expect.any(Date) });
  else expect(update.status).toBe(option);
  expect(res.json).toHaveBeenCalledWith({ code: "success" });
});
test("bulk delete is denied without delete permission", async () => {
  const option = "delete";
  const res = response(); await controller.changeMultiPatch(request({ body: { option, ids: ["a"] } }), res);
  expect(Tour.updateMany).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
test("restore clears deletion metadata", async () => {
  Tour.updateOne.mockResolvedValue({ matchedCount: 1 });
  await controller.undoPatch(request({ permissions: ["tour-trash"] }), response());
  expect(Tour.updateOne).toHaveBeenCalledWith({ _id: "target-id", deleted: true }, { $set: { deleted: false, updatedBy: "admin-id" }, $unset: { deletedBy: "", deletedAt: "" } });
});
test("permanent deletion is restricted to the trash", async () => {
  Tour.deleteOne.mockResolvedValue({ deletedCount: 1 });
  await controller.deleteDestroyPatch(request({ permissions: ["tour-trash"] }), response());
  expect(Tour.deleteOne).toHaveBeenCalledWith({ _id: "target-id", deleted: true });
});
test("trash pages contain at most five records and clamp an excessive page", async () => {
  Tour.countDocuments.mockResolvedValue(12); const result = query([]); Tour.find.mockReturnValue(result);
  const res = response(); await controller.trash(request({ query: { page: "99" } }), res);
  expect(result.limit).toHaveBeenCalledWith(5); expect(result.skip).toHaveBeenCalledWith(10);
  expect(res.render.mock.calls[0][1].pagination).toMatchObject({ currentPage: 3, totalRecord: 12, totalPage: 3 });
});
test("parent category filter includes inactive descendants in admin lists", async () => {
  // Descendants are queried first; the final query populates the dropdown.
  Category.find.mockImplementation(find => find.parent === "root" ? Promise.resolve([{ id: "child" }]) : find.parent ? Promise.resolve([]) : query([]));
  Tour.countDocuments.mockResolvedValue(0); Tour.find.mockReturnValue(query([])); Account.find.mockReturnValue(query([]));
  await controller.list(request({ query: { category: "root" } }), response());
  expect(Tour.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ category: { $in: ["root", "child"] } }));
});
