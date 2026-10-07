const Tour = require("../../models/tour.model");
const Category = require("../../models/category.model");
const categoryHelper = require("../../helpers/category.helper");
const moment = require("moment");
const slugify = require('slugify');
const paginationHelper = require("../../helpers/pagination.helper");

module.exports.list = async (req, res) => {
  const find = {
    status: "active",
    deleted: false
  };

  // Điểm đi
  if(req.query.locationFrom) {
    find.locations = req.query.locationFrom;
  }
  // Hết Điểm đi

  // Điểm đến
  if(req.query.locationTo?.trim()) {
    const keyword = slugify(req.query.locationTo.trim(), {
      lower: true
    });
    const keywordRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const categories = await Category.find({ status: "active", deleted: false, slug: keywordRegex });
    const categoryGroups = await Promise.all(categories.map(category => categoryHelper.getAllSubcategoryIds(category.id)));
    const categoryIds = [...new Set(categoryGroups.flat())];
    find.$or = [
      { slug: keywordRegex },
      { category: { $in: categoryIds } }
    ];
  }
  // Hết Điểm đến

  // Ngày khởi hành  
  if(req.query.departureDate) {
    find.departureDate = new Date(req.query.departureDate);
  }
  // Hết Ngày khởi hành

  // Số lượng hành khách
  // Người lớn
  if(req.query.stockAdult) {
    find.stockAdult = {
      $gte: parseInt(req.query.stockAdult)
    }
  }

  // Trẻ em
  if(req.query.stockChildren) {
    find.stockChildren = {
      $gte: parseInt(req.query.stockChildren)
    }
  }

  // Em bé
  if(req.query.stockBaby) {
    find.stockBaby = {
      $gte: parseInt(req.query.stockBaby)
    }
  }

  // Hết Số lượng hành khách

  // Mức giá
  if(req.query.price) {
    const [priceMin, priceMax] = req.query.price.split("-").map(item => parseInt(item));
    
    find.priceNewAdult = {
      $gte: priceMin,
      $lte: priceMax
    };
  }
  // Hết Mức giá

  const totalTour = await Tour.countDocuments(find);
  const pagination = paginationHelper(totalTour, req);

  const tourList = await Tour
    .find(find)
    .sort({
      position: "desc",
      _id: "desc"
    })
    .limit(pagination.limitItems)
    .skip(pagination.skip)

  for(const item of tourList) {
    item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");
  }

  res.render("client/pages/search", {
    pageTitle: "Kết quả tìm kiếm",
    tourList: tourList,
    pagination: pagination
  });
}
