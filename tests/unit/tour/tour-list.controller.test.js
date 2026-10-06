const Tour = require("../../../models/tour.model");
const Category = require("../../../models/category.model");
const City = require("../../../models/city.model");
const category = require("../../../controllers/client/category.controller");
const search = require("../../../controllers/client/search.controller");
const { request, response, query } = require("../../mocks/http.mock");
test("category sorts all prices before selecting page two", async () => {
  const sort = "price-asc";
  const tours = Array.from({ length: 12 }, (_, i) => ({ id: String(i), priceAdult: 2000, priceNewAdult: (i + 1) * 100, departureDate: "2026-10-06" }));
  Category.findOne.mockResolvedValue({ id: "root", name: "Domestic", slug: "domestic", parent: "" }); Category.find.mockResolvedValue([]);
  Tour.countDocuments.mockResolvedValue(12); Tour.find.mockReturnValue(query(tours)); City.find.mockResolvedValue([]);
  const res = response(); await category.list(request({ params: { slug: "domestic" }, query: { page: "2", sort }, originalUrl: "/category/domestic" }), res);
  const data = res.render.mock.calls[0][1];
  expect(data.tourList).toHaveLength(3); expect(data.totalTour).toBe(12);
  expect(data.tourList[0].priceNewAdult).toBe(sort === "price-desc" ? 300 : 1000);
  expect(data.pagination.currentPage).toBe(2);
});
test("search combines filters and requests nine tours per page", async () => {
  Tour.countDocuments.mockResolvedValue(20); const result = query([]); Tour.find.mockReturnValue(result);
  const res = response(); await search.list(request({ query: { page: "2", locationFrom: "city-id", locationTo: "Ha Noi", price: "1000-5000", stockAdult: "2", departureDate: "2026-10-06" } }), res);
  const find = Tour.countDocuments.mock.calls[0][0];
  expect(find).toMatchObject({ deleted: false, status: "active", locations: "city-id", priceNewAdult: { $gte: 1000, $lte: 5000 }, stockAdult: { $gte: 2 } });
  expect(find.slug.test("ha-noi")).toBe(true); expect(find.departureDate).toEqual(new Date("2026-10-06"));
  expect(result.limit).toHaveBeenCalledWith(9); expect(result.skip).toHaveBeenCalledWith(9);
});
