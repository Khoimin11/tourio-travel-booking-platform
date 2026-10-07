const Order = require("../../models/order.model");
const City = require("../../models/city.model");
const variableConfig = require("../../config/variable");
const moment = require("moment");

const changeOrders = async (req, res, action, bulk = false) => {
  const permission = action === "delete" ? "order-delete" : "order-trash";
  if(!req.permissions.includes(permission)) {
    return res.json({ code: "error", message: "Không có quyền sử dụng tính năng này!" });
  }

  const ids = bulk ? req.body.ids : [req.params.id];
  if(!["delete", "undo", "delete-destroy"].includes(action) || !Array.isArray(ids) ||
    !ids.length || !ids.every(id => typeof id === "string" && id.trim())) {
    return res.json({ code: "error", message: "Vui lòng chọn hành động và đơn hàng hợp lệ!" });
  }

  try {
    const find = { _id: bulk ? { $in: ids } : ids[0], deleted: action !== "delete" };
    let result;
    if(action === "delete-destroy") {
      result = await Order[bulk ? "deleteMany" : "deleteOne"](find);
      if(!result.deletedCount) return res.json({ code: "error", message: "Đơn hàng không còn trong thùng rác!" });
    } else {
      const update = action === "delete" ? {
        $set: { deleted: true, deletedBy: req.account.id, deletedAt: new Date(), updatedBy: req.account.id }
      } : {
        $set: { deleted: false, updatedBy: req.account.id },
        $unset: { deletedBy: "", deletedAt: "" }
      };
      result = await Order[bulk ? "updateMany" : "updateOne"](find, update);
      if(!result.matchedCount) return res.json({ code: "error", message: "Không tìm thấy đơn hàng hợp lệ!" });
    }

    const messages = {
      delete: "Đã chuyển đơn hàng vào thùng rác!",
      undo: "Khôi phục đơn hàng thành công!",
      "delete-destroy": "Xóa vĩnh viễn đơn hàng thành công!"
    };
    req.flash("success", messages[action]);
    res.json({ code: "success" });
  } catch(error) {
    res.json({ code: "error", message: "Không thể cập nhật các đơn hàng đã chọn!" });
  }
};

module.exports.deletePatch = (req, res) => changeOrders(req, res, "delete");
module.exports.undoPatch = (req, res) => changeOrders(req, res, "undo");
module.exports.deleteDestroyPatch = (req, res) => changeOrders(req, res, "delete-destroy");
module.exports.changeMultiPatch = (req, res) => changeOrders(req, res, req.body.option === "delete" ? "delete" : "", true);
module.exports.trashChangeMultiPatch = (req, res) => changeOrders(req, res, ["undo", "delete-destroy"].includes(req.body.option) ? req.body.option : "", true);

const renderOrderList = async (req, res, deleted) => {
  const find = {
    deleted
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

  const limitItems = deleted ? 5 : 9;
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
      [deleted ? "deletedAt" : "createdAt"]: "desc"
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

  res.render(deleted ? "admin/pages/order-trash" : "admin/pages/order-list", {
    pageTitle: deleted ? "Thùng rác đơn hàng" : "Quản lý đơn hàng",
    orderList: orderList,
    pagination: pagination,
    paymentMethodList: variableConfig.paymentMethod,
    paymentStatusList: variableConfig.paymentStatus,
    orderStatusList: variableConfig.orderStatus
  })
}

module.exports.list = (req, res) => renderOrderList(req, res, false);
module.exports.trash = (req, res) => {
  if(!req.permissions.includes("order-trash")) return res.redirect(`/${pathAdmin}/order/list`);
  return renderOrderList(req, res, true);
};

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
