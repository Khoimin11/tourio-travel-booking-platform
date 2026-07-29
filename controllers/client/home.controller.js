const Tour = require("../../models/tour.model");
const Category = require("../../models/category.model");
const moment = require("moment");
const categoryHelper = require("../../helpers/category.helper");

module.exports.home = async (req, res) => {
  // Section 2
  const tourListSection2 = await Tour
    .find({
      deleted: false,
      status: "active"
    })
    .sort({
      position: "desc"
    })
    .limit(6)

  for(const item of tourListSection2) {
    item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");
  }
  // End Section 2

  // Section 3
  const categoryInternational = await Category.findOne({
    deleted: false,
    status: "active",
    $or: [
      { name: "Tour Nước Ngoài" },
      { slug: "tour-nuoc-ngoai" }
    ]
  });

  let tourListSection3 = [];

  if (categoryInternational) {
    const listCategoryIdSection3 = await categoryHelper.getAllSubcategoryIds(categoryInternational.id);

    tourListSection3 = await Tour
      .find({
        category: { $in: listCategoryIdSection3 },
        deleted: false,
        status: "active",
        avatar: {
          $nin: [null, ""]
        }
      })
      .sort({
        position: "desc"
      })
      .limit(4)
      .select("name slug avatar");
  }
  // End Section 3

  // Section 4: Tour Trong Nước
  const categoryIdSection4 = "6a4f7076bcc9df6e50703720";
  const listCategoryId = await categoryHelper.getAllSubcategoryIds(categoryIdSection4);

  const tourListSection4 = await Tour
    .find({
      category: { $in: listCategoryId },
      deleted: false,
      status: "active"
    })
    .sort({
      position: "desc"
    })
    .limit(8)

  for(const item of tourListSection4) {
    item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");
  }
  // End Section 4: Tour Trong Nước

  // Section 6: Tour Nước Ngoài
  let tourListSection6 = [];

  if (categoryInternational) {
    const listCategoryIdSection6 = await categoryHelper.getAllSubcategoryIds(categoryInternational.id);

    tourListSection6 = await Tour
      .find({
        category: { $in: listCategoryIdSection6 },
        deleted: false,
        status: "active"
      })
      .sort({
        position: "desc"
      })
      .limit(8)

    for (const item of tourListSection6) {
      item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");
    }
  }
  // End Section 6: Tour Nước Ngoài

  res.render("client/pages/home", {
    pageTitle: "Trang chủ",
    tourListSection2: tourListSection2,
    tourListSection3: tourListSection3,
    tourListSection4: tourListSection4,
    tourListSection6: tourListSection6
  })
}
