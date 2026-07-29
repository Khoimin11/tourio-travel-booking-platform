const moment = require("moment");
const AccountAdmin = require("../../models/account-admin.model");

module.exports.list = async (req, res) => {
  const find = {
    deleted: false
  };

  if(req.query.status) {
    find.status = req.query.status;
  }

  const dateFilter = {};

  if(req.query.startDate) {
    dateFilter.$gte = moment(req.query.startDate).startOf("date").toDate();
  }

  if(req.query.endDate) {
    dateFilter.$lte = moment(req.query.endDate).endOf("date").toDate();
  }

  if(Object.keys(dateFilter).length > 0) {
    find.createdAt = dateFilter;
  }

  if(req.query.keyword) {
    const keyword = req.query.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const keywordRegex = new RegExp(keyword, "i");
    find.$or = [
      { fullName: keywordRegex },
      { email: keywordRegex },
      { phone: keywordRegex }
    ];
  }

  const limitItems = 9;
  let page = 1;
  if(req.query.page) {
    const currentPage = parseInt(req.query.page);
    if(currentPage > 0) {
      page = currentPage;
    }
  }

  const totalRecord = await AccountAdmin.countDocuments(find);
  const totalPage = Math.ceil(totalRecord / limitItems);
  if(totalPage === 0) {
    page = 1;
  } else if(page > totalPage) {
    page = totalPage;
  }

  const skip = totalRecord > 0 ? (page - 1) * limitItems : 0;
  const pagination = {
    currentPage: page,
    skip: skip,
    totalRecord: totalRecord,
    totalPage: totalPage
  };

  const userList = await AccountAdmin
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .limit(limitItems)
    .skip(skip);

  for (const item of userList) {
    item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY");
  }

  res.render("admin/pages/user-list", {
    pageTitle: "Quản lý người dùng",
    userList: userList,
    pagination: pagination
  })
}
