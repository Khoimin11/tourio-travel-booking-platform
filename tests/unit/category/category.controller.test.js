const Category = require("../../../models/category.model");
const Account = require("../../../models/account-admin.model");
const adminCategory = require("../../../controllers/admin/category.controller");
const { request, response, query } = require("../../mocks/http.mock");
test("filtered category child retains its ancestors but not siblings", async () => {
  const root = { id: "root", parent: "", name: "Root" }, child = { id: "child", parent: "root", name: "Child" };
  Category.find.mockReturnValueOnce(query([child])).mockReturnValueOnce(query([{ id: "sibling", parent: "root" }, child, root])); Account.find.mockReturnValue(query([]));
  const res = response(); await adminCategory.list(request({ query: { status: "active", createdBy: "author" } }), res);
  expect(res.render.mock.calls[0][1].categoryList.map(row => [row.item.id, row.depth])).toEqual([["root", 0], ["child", 1]]);
});
