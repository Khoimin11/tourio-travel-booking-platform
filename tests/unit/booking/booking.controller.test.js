const Tour = require("../../../models/tour.model");
const Order = require("../../../models/order.model");
const controller = require("../../../controllers/client/order.controller");
const { request, response } = require("../../mocks/http.mock");
const item = require("../../mocks/booking.mock");
const tour = require("../../mocks/tour.mock")();
test("booking uses database prices, calculates totals and reserves stock", async () => {
  Tour.findOne.mockResolvedValue(tour); Tour.updateOne.mockResolvedValue({ modifiedCount: 1 }); Order.save.mockResolvedValue();
  const res = response(); await controller.createPost(request({ body: { items: [item()], paymentMethod: "vnpay" } }), res);
  expect(Order.mock.instances[0]).toMatchObject({ subTotal: 2500, total: 2500, discount: 0, paymentStatus: "unpaid", status: "initial" });
  expect(Tour.updateOne).toHaveBeenCalledWith({ _id: "tour-id" }, { stockAdult: 8, stockChildren: 9, stockBaby: 10 });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "success" }));
});
test("insufficient adult stock prevents booking", async () => {
  const stock = "stockAdult";
  Tour.findOne.mockResolvedValue({ ...tour, [stock]: 0 });
  const res = response(); await controller.createPost(request({ body: { items: [item()] } }), res);
  expect(Order.save).not.toHaveBeenCalled(); expect(Tour.updateOne).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
test.each([[], [{ ...item(), quantityAdult: -1 }]].map(items => ({ items })))("invalid booking items $items cannot create an order", async ({ items }) => {
  Tour.findOne.mockResolvedValue(tour); Tour.updateOne.mockResolvedValue({ modifiedCount: 1 }); Order.save.mockResolvedValue();
  const res = response(); await controller.createPost(request({ body: { items } }), res);
  expect(Order.save).not.toHaveBeenCalled(); expect(Tour.updateOne).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
test("a later sold-out tour does not reserve stock for earlier tours", async () => {
  Tour.findOne.mockResolvedValueOnce(tour).mockResolvedValueOnce({ ...tour, stockAdult: 0 });
  Tour.updateOne.mockResolvedValue({ modifiedCount: 1 });
  await controller.createPost(request({ body: { items: [item(), { ...item(), tourId: "second" }] } }), response());
  expect(Tour.updateOne).not.toHaveBeenCalled(); expect(Order.save).not.toHaveBeenCalled();
});
test("booking an unavailable tour cannot trust client-supplied prices", async () => {
  Tour.findOne.mockResolvedValue(null); Order.save.mockResolvedValue(); const res = response();
  await controller.createPost(request({ body: { items: [{ ...item(), priceNewChildren: 1, priceNewBaby: 1 }] } }), res);
  expect(Order.save).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
