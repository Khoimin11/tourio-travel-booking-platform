const Order = require("../../models/order.model");
const City = require("../../models/city.model");
const variableConfig = require("../../config/variable");
const moment = require("moment");

module.exports.list = async (req, res) => {
  const find = {
    deleted: false
  };

  const orderList = await Order
    .find(find)
    .sort({
      createdAt: "desc"
    });

  for (const orderDetail of orderList) {
    orderDetail.paymentMethodName = variableConfig.paymentMethod.find(item => item.value == orderDetail.paymentMethod).label;
    
    orderDetail.paymentStatusName = variableConfig.paymentStatus.find(item => item.value == orderDetail.paymentStatus).label;

    orderDetail.statusName = variableConfig.orderStatus.find(item => item.value == orderDetail.status).label;

    orderDetail.createdAtTime = moment(orderDetail.createdAt).format("HH:mm");
    orderDetail.createdAtDate = moment(orderDetail.createdAt).format("DD/MM/YYYY");
  }

  res.render("admin/pages/order-list", {
    pageTitle: "Quản lý đơn hàng",
    orderList: orderList
  })
}

module.exports.list = async (req, res) => {
  const find = {
    deleted: false
  };

  if(req.query.status) {
    find.status = req.query.status;
  }

  if(req.query.paymentMethod) {
    find.paymentMethod = req.query.paymentMethod;
  }

  if(req.query.paymentStatus) {
    find.paymentStatus = req.query.paymentStatus;
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
      { orderCode: keywordRegex },
      { fullName: keywordRegex },
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

  const totalRecord = await Order.countDocuments(find);
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

  const orderList = await Order
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .limit(limitItems)
    .skip(skip);

  for (const orderDetail of orderList) {
    const paymentMethod = variableConfig.paymentMethod.find(item => item.value == orderDetail.paymentMethod);
    const paymentStatus = variableConfig.paymentStatus.find(item => item.value == orderDetail.paymentStatus);
    const status = variableConfig.orderStatus.find(item => item.value == orderDetail.status);

    orderDetail.paymentMethodName = paymentMethod ? paymentMethod.label : "";
    orderDetail.paymentStatusName = paymentStatus ? paymentStatus.label : "";
    orderDetail.statusName = status ? status.label : "";
    orderDetail.createdAtTime = moment(orderDetail.createdAt).format("HH:mm");
    orderDetail.createdAtDate = moment(orderDetail.createdAt).format("DD/MM/YYYY");
  }

  res.render("admin/pages/order-list", {
    pageTitle: "Quản lý đơn hàng",
    orderList: orderList,
    pagination: pagination,
    paymentMethodList: variableConfig.paymentMethod,
    paymentStatusList: variableConfig.paymentStatus,
    orderStatusList: variableConfig.orderStatus
  })
}

module.exports.edit = async (req, res) => {
  try {
    const id = req.params.id;

    const orderDetail = await Order.findOne({
      _id: id,
      deleted: false
    })

    orderDetail.createdAtFormat = moment(orderDetail.createdAt).format("YYYY-MM-DDTHH:mm");

    for (const item of orderDetail.items) {
      const city = await City.findOne({
        _id: item.locationFrom
      });
      item.locationFromName = city.name;
      item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");
    }

    res.render("admin/pages/order-edit", {
      pageTitle: `Đơn hàng: ${orderDetail.orderCode}`,
      orderDetail: orderDetail,
      paymentMethod: variableConfig.paymentMethod,
      paymentStatus: variableConfig.paymentStatus,
      orderStatus: variableConfig.orderStatus
    })
  } catch (error) {
    res.redirect(`/${pathAdmin}/order/list`);
  }
}

module.exports.editPatch = async (req, res) => {
  try {
    const id = req.params.id;

    const order = await Order.findOne({
      _id: id,
      deleted: false
    });

    if(!order) {
      res.json({
        code: "error",
        message: "Thông tin đơn hàng không hợp lệ!"
      })
      return;
    }

    await Order.updateOne({
      _id: id,
      deleted: false
    }, req.body);

    req.flash("success", "Cập nhật đơn hàng thành công!");

    res.json({
      code: "success"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Thông tin đơn hàng không hợp lệ!"
    })
  }
}
