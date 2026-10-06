const Category = require("../../models/category.model");
const Tour = require("../../models/tour.model");
const City = require("../../models/city.model");
const moment = require("moment");
const categoryHelper = require("../../helpers/category.helper");
const paginationHelper = require("../../helpers/pagination.helper");

module.exports.list = async (req, res) => {
  // Lấy slug từ params
  const slug = req.params.slug;
  const currentSort = req.query.sort || "";

  // Tìm danh mục theo slug
  const category = await Category.findOne({
    slug: slug,
    deleted: false,
    status: "active"
  })

  if(category) {
    // Breadcrumb
    const breadcrumb = {
      image: category.avatar,
      title: category.name,
      list: [
        {
          link: "/",
          title: "Trang Chủ"
        }
      ]
    };

    // Tìm danh mục cha
    if(category.parent) {
      const parentCategory = await Category.findOne({
        _id: category.parent,
        deleted: false,
        status: "active"
      })

      if(parentCategory) {
        breadcrumb.list.push({
          link: `/category/${parentCategory.slug}`,
          title: parentCategory.name
        })
      }
    }

    // Thêm danh mục hiện tại
    breadcrumb.list.push({
      link: `/category/${category.slug}`,
      title: category.name
    })
    // End Breadcrumb

    // Danh sách tour
    const listCategoryId = await categoryHelper.getAllSubcategoryIds(category.id);
    const find = {
      category: { $in: listCategoryId },
      deleted: false,
      status: "active"
    };

    const totalTour = await Tour.countDocuments(find);
    const pagination = paginationHelper(totalTour, req);

    const tourList = await Tour
      .find(find)
      .sort({
        position: "desc",
        _id: "desc"
      })

    for(const item of tourList) {
      item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");
      item.discountPercent = item.priceAdult > 0
        ? parseInt(((item.priceAdult - item.priceNewAdult) / item.priceAdult) * 100)
        : 0;
    }

    if(currentSort === "price-asc") {
      tourList.sort((a, b) => a.priceNewAdult - b.priceNewAdult);
    } else if(currentSort === "price-desc") {
      tourList.sort((a, b) => b.priceNewAdult - a.priceNewAdult);
    } else if(currentSort === "discount-desc" || !currentSort) {
      tourList.sort((a, b) => b.discountPercent - a.discountPercent);
    }
    // Hết Danh sách tour

    // Danh sách thành phố
    const cityList = await City.find({});
    // Hết Danh sách thành phố

    res.render("client/pages/tour-list", {
      pageTitle: "Danh sách tour",
      breadcrumb: breadcrumb,
      category: category,
      tourList: tourList.slice(pagination.skip, pagination.skip + pagination.limitItems),
      totalTour: totalTour,
      cityList: cityList,
      currentSort: currentSort,
      pagination: pagination
    });
  } else {
    res.redirect("/");
  }
}
