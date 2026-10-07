const Order = require("../../../models/order.model");
const adminOrder = require("../../../controllers/admin/order.controller");
const { request, response, query } = require("../../mocks/http.mock");
test("order filters preserve status, payment method and payment status", async () => {
  Order.countDocuments.mockResolvedValue(0); Order.find.mockReturnValue(query([])); const res = response();
  await adminOrder.list(request({ query: { status: "done", paymentMethod: "vnpay", paymentStatus: "paid", keyword: "OD.1" } }), res);
  const find = Order.countDocuments.mock.calls[0][0];
  expect(find).toMatchObject({ deleted: false, status: "done", paymentMethod: "vnpay", paymentStatus: "paid" });
  expect(find.$or[0].orderCode.test("OD.1")).toBe(true); expect(find.$or[0].orderCode.test("ODX1")).toBe(false);
  Order.countDocuments.mockResolvedValue(12);
  const result = query([]); Order.find.mockReturnValue(result);
  const trashRes = response();
  await adminOrder.trash(request({ permissions: ["order-trash"], query: { page: "99", status: "done", paymentMethod: "vnpay", paymentStatus: "paid", keyword: "OD.1", startDate: "2026-10-01", endDate: "2026-10-07" } }), trashRes);
  const trashFind = Order.countDocuments.mock.calls[1][0];
  expect(trashFind).toMatchObject({ deleted: true, status: "done", paymentMethod: "vnpay", paymentStatus: "paid" });
  expect(trashFind.createdAt.$gte.getTime()).toBe(new Date(2026, 9, 1).getTime());
  expect(trashFind.createdAt.$lte.getTime()).toBe(new Date(2026, 9, 7, 23, 59, 59, 999).getTime());
  expect(result.limit).toHaveBeenCalledWith(5); expect(result.skip).toHaveBeenCalledWith(10);
  expect(trashRes.render.mock.calls[0][0]).toBe("admin/pages/order-trash");
  expect(trashRes.render.mock.calls[0][1].pagination).toMatchObject({ currentPage: 3, totalPage: 3 });
});

test("orders can be soft deleted, restored and permanently deleted individually or in bulk", async () => {
  Order.updateOne.mockResolvedValue({ matchedCount: 1 });
  Order.updateMany.mockResolvedValue({ matchedCount: 2 });
  Order.deleteOne.mockResolvedValue({ deletedCount: 1 });
  Order.deleteMany.mockResolvedValue({ deletedCount: 2 });
  for(const [handler, action, bulk] of [
    ["deletePatch", "delete", false], ["undoPatch", "undo", false], ["deleteDestroyPatch", "delete-destroy", false],
    ["changeMultiPatch", "delete", true], ["trashChangeMultiPatch", "undo", true], ["trashChangeMultiPatch", "delete-destroy", true]
  ]) {
    const res = response();
    await adminOrder[handler](request({ permissions: ["order-delete", "order-trash"], body: { option: action, ids: ["a", "b"] } }), res);
    const method = action === "delete-destroy" ? (bulk ? "deleteMany" : "deleteOne") : (bulk ? "updateMany" : "updateOne");
    const call = Order[method].mock.calls.at(-1);
    expect(call[0]).toEqual({ _id: bulk ? { $in: ["a", "b"] } : "target-id", deleted: action !== "delete" });
    if(action === "undo") expect(call[1]).toEqual({ $set: { deleted: false, updatedBy: "admin-id" }, $unset: { deletedBy: "", deletedAt: "" } });
    if(action === "delete") expect(call[1].$set).toMatchObject({ deleted: true, deletedBy: "admin-id", deletedAt: expect.any(Date) });
    expect(res.json).toHaveBeenCalledWith({ code: "success" });
  }
});

test("order trash rejects unauthorized actions, invalid bulk inputs and missing records", async () => {
  for(const handler of ["deletePatch", "undoPatch", "deleteDestroyPatch", "changeMultiPatch", "trashChangeMultiPatch"]) {
    const res = response(); await adminOrder[handler](request(), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
  }
  for(const body of [{ option: "delete", ids: [] }, { option: "undo", ids: ["a"] }]) {
    const res = response(); await adminOrder.changeMultiPatch(request({ permissions: ["order-delete", "order-trash"], body }), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
  }
  expect(Order.updateMany).not.toHaveBeenCalled();
  Order.deleteOne.mockResolvedValue({ deletedCount: 0 });
  const res = response(); await adminOrder.deleteDestroyPatch(request({ permissions: ["order-trash"] }), res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
test("admin order edit updates a non-deleted order", async () => {
  Order.findOne.mockResolvedValue({ id: "target-id" }); Order.updateOne.mockResolvedValue({ matchedCount: 1 });
  await adminOrder.editPatch(request({ body: { status: "done" } }), response());
  expect(Order.updateOne).toHaveBeenCalledWith({ _id: "target-id", deleted: false }, { status: "done" });
});
