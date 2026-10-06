const pagination = require("../../../helpers/pagination.helper");
const req = page => ({ query: { page, sort: "price-asc", price: "0-2000000" }, originalUrl: "/category/domestic?sort=price-asc" });
test.each([
  [0, "1", 1, 0, 0], [23, "2", 2, 3, 9], [23, "99", 3, 3, 18]
])("%i records, page %s -> correct bounds", (total, page, currentPage, totalPage, skip) => {
  expect(pagination(total, req(page))).toMatchObject({ currentPage, totalPage, skip, limitItems: 9 });
});
test("page links retain filters and replace the old page", () => {
  const url = new URL(pagination(23, req("1")).getPageLink(2), "https://shop.test");
  expect(url.pathname).toBe("/category/domestic");
  expect(Object.fromEntries(url.searchParams)).toEqual({ page: "2", sort: "price-asc", price: "0-2000000" });
});
