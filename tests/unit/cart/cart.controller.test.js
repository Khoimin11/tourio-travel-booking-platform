const Tour = require("../../../models/tour.model");
const City = require("../../../models/city.model");
const cart = require("../../../controllers/client/cart.controller");
const { request, response } = require("../../mocks/http.mock");
const item = require("../../mocks/booking.mock");
const tour = require("../../mocks/tour.mock")();
test("cart displays current database prices and departure dates", async () => {
  Tour.findOne.mockResolvedValue(tour); City.findOne.mockResolvedValue({ name: "City" });
  const res = response(); await cart.detail(request({ body: [item()] }), res);
  expect(res.json.mock.calls[0][0].cart[0]).toMatchObject({ priceNewAdult: 1000, departureDateFormat: "06/10/2026", locationFromName: "City" });
});
test("two consecutive unavailable tours are both removed from cart", async () => {
  Tour.findOne.mockResolvedValue(null); const res = response();
  await cart.detail(request({ body: [item(), { ...item(), tourId: "second" }] }), res);
  expect(res.json).toHaveBeenCalledWith({ code: "success", cart: [] });
});
