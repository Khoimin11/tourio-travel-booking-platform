const moment = require("moment");
const Contact = require("../../models/contact.model");

module.exports.list = async (req, res) => {
  const find = {
    deleted: false
  };

  const contactList = await Contact
    .find(find)
    .sort({
      createdAt: "desc"
    });

  for (const item of contactList) {
    item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY");
  }

  res.render("admin/pages/contact-list", {
    pageTitle: "Thông tin liên hệ",
    contactList: contactList
  })
}

module.exports.list = async (req, res) => {
  const find = {
    deleted: false
  };

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
    find.email = new RegExp(keyword, "i");
  }

  const limitItems = 9;
  let page = 1;
  if(req.query.page) {
    const currentPage = parseInt(req.query.page);
    if(currentPage > 0) {
      page = currentPage;
    }
  }

  const totalRecord = await Contact.countDocuments(find);
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

  const contactList = await Contact
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .limit(limitItems)
    .skip(skip);

  for (const item of contactList) {
    item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY");
  }

  res.render("admin/pages/contact-list", {
    pageTitle: "Thông tin liên hệ",
    contactList: contactList,
    pagination: pagination
  })
}
