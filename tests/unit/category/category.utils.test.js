const Category = require("../../../models/category.model");
const helper = require("../../../helpers/category.helper");
const categories = [
  { id: "new-child", parent: "root", name: "New" },
  { id: "nested", parent: "old-child", name: "Nested" },
  { id: "old-child", parent: "root", name: "Old" },
  { id: "root", parent: "", name: "Root" }
];
test("new children stay below their parent with correct nesting", () => {
  const rows = helper.flattenCategoryList(categories);
  expect(rows.map(row => [row.item.id, row.depth])).toEqual([["root", 0], ["new-child", 1], ["old-child", 1], ["nested", 2]]);
  expect(rows[1].item).toBe(categories[0]);
});
test("builds nested category options", () => {
  const tree = helper.buildCategoryTree(categories);
  expect(tree[0].children.map(child => child.id)).toEqual(["new-child", "old-child"]);
  expect(tree[0].children[1].children[0].id).toBe("nested");
});
test("admin descendant lookup includes inactive categories", async () => {
  const activeOnly = false;
  Category.find.mockImplementation(async find => find.parent === "root"
    ? [{ id: "child" }, ...(!find.status ? [{ id: "inactive" }] : [])] : []);
  expect(await helper.getAllSubcategoryIds("root", activeOnly)).toEqual(activeOnly ? ["root", "child"] : ["root", "child", "inactive"]);
  expect(Category.find).toHaveBeenCalledWith(activeOnly ? { parent: "root", deleted: false, status: "active" } : { parent: "root", deleted: false });
});
