const Category = require("../models/category.model");

// Lấy cây danh mục
const buildCategoryTree = (categories, parentId = "") => {
  const tree = [];

  categories.forEach(item => {
    if(item.parent == parentId) {
      const children = buildCategoryTree(categories, item.id);

      tree.push({
        id: item.id,
        name: item.name,
        slug: item.slug,
        children: children
      })
    }
  })

  return tree;
}

module.exports.buildCategoryTree = buildCategoryTree;
// Hết Lấy cây danh mục

// Sắp xếp danh sách theo thứ tự cha - con, giữ nguyên thông tin danh mục
module.exports.flattenCategoryList = (categories) => {
  const result = [];
  const ids = new Set(categories.map(item => item.id));
  const visited = new Set();

  const append = (item, depth = 0) => {
    if(visited.has(item.id)) return;
    visited.add(item.id);
    result.push({ item, depth });
    categories.filter(child => child.parent === item.id)
      .forEach(child => append(child, depth + 1));
  };

  categories.filter(item => !ids.has(item.parent)).forEach(item => append(item));
  // Giữ các danh mục có quan hệ cha - con bị vòng lặp trong danh sách
  categories.forEach(item => append(item));
  return result;
};

// Lấy tất cả id của danh mục cha + con
module.exports.getAllSubcategoryIds = async (parentId, activeOnly = true) => {
  // Mảng lưu tất cả ID của danh mục (gồm danh mục cha và các danh mục con)
  const result = [parentId];

  // Hàm đệ quy để tìm các danh mục con
  const findChildren = async (currentId) => {
    const find = { parent: currentId, deleted: false };
    if(activeOnly) find.status = "active";
    const children = await Category.find(find);

    // Duyệt qua từng danh mục con tìm được
    for (const child of children) {
      if(result.includes(child.id)) continue;
      result.push(child.id); // Thêm ID vào danh sách kết quả
      await findChildren(child.id); // Gọi đệ quy để tìm danh mục con của danh mục này
    }
  };

  // Bắt đầu đệ quy từ danh mục gốc
  await findChildren(parentId);

  // Trả về toàn bộ danh sách ID đã thu thập được
  return result;
};
// Hết Lấy tất cả id của danh mục cha + con
