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
  Category.find.mockResolvedValue([]);
  Tour.countDocuments.mockResolvedValue(20); const result = query([]); Tour.find.mockReturnValue(result);
  const res = response(); await search.list(request({ query: { page: "2", locationFrom: "city-id", locationTo: "Ha Noi", price: "1000-5000", stockAdult: "2", departureDate: "2026-10-06" } }), res);
  const find = Tour.countDocuments.mock.calls[0][0];
  expect(find).toMatchObject({ deleted: false, status: "active", locations: "city-id", priceNewAdult: { $gte: 1000, $lte: 5000 }, stockAdult: { $gte: 2 } });
  expect(find.$or[0].slug.test("ha-noi")).toBe(true); expect(find.departureDate).toEqual(new Date("2026-10-06"));
  expect(result.limit).toHaveBeenCalledWith(9); expect(result.skip).toHaveBeenCalledWith(9);
});

test.each(["nhật bản", "nhat ban"])("search for %s includes tours in matching categories and their children", async locationTo => {
  Category.find.mockImplementation(find => {
    if(find.slug) return Promise.resolve([{ id: "japan" }]);
    return Promise.resolve(find.parent === "japan" ? [{ id: "tokyo" }] : []);
  });
  Tour.countDocuments.mockResolvedValue(1);
  Tour.find.mockReturnValue(query([{ name: "Tokyo - Fuji - Hakone", slug: "tokyo-fuji-hakone", category: "japan", departureDate: "2026-10-06" }]));
  const res = response();
  await search.list(request({ query: { locationTo } }), res);
  const categoryFind = Category.find.mock.calls[0][0];
  expect(categoryFind).toMatchObject({ status: "active", deleted: false });
  expect(categoryFind.slug.test("tour-nhat-ban")).toBe(true);
  const find = Tour.countDocuments.mock.calls[0][0];
  expect(find).toMatchObject({ status: "active", deleted: false });
  expect(find.$or[0].slug.test("tour-nhat-ban-osaka")).toBe(true);
  expect(find.$or[1]).toEqual({ category: { $in: ["japan", "tokyo"] } });
  expect(Tour.find).toHaveBeenCalledWith(find);
  expect(Category.find).toHaveBeenCalledWith({ parent: "japan", status: "active", deleted: false });
  expect(res.render.mock.calls[0][1].tourList[0].name).toBe("Tokyo - Fuji - Hakone");
});
