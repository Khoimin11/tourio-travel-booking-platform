const Order = require("../../../models/order.model");
const adminOrder = require("../../../controllers/admin/order.controller");
const { request, response, query } = require("../../mocks/http.mock");
test("order filters preserve status, payment method and payment status", async () => {
  Order.countDocuments.mockResolvedValue(0); Order.find.mockReturnValue(query([])); const res = response();
  await adminOrder.list(request({ query: { status: "done", paymentMethod: "vnpay", paymentStatus: "paid", keyword: "OD.1" } }), res);
  const find = Order.countDocuments.mock.calls[0][0];
  expect(find).toMatchObject({ deleted: false, status: "done", paymentMethod: "vnpay", paymentStatus: "paid" });
  expect(find.$or[0].orderCode.test("OD.1")).toBe(true); expect(find.$or[0].orderCode.test("ODX1")).toBe(false);
});
test("admin order edit updates a non-deleted order", async () => {
  Order.findOne.mockResolvedValue({ id: "target-id" }); Order.updateOne.mockResolvedValue({ matchedCount: 1 });
  await adminOrder.editPatch(request({ body: { status: "done" } }), response());
  expect(Order.updateOne).toHaveBeenCalledWith({ _id: "target-id", deleted: false }, { status: "done" });
});
