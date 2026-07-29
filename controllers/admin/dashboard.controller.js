const AccountAdmin = require("../../models/account-admin.model");
const Order = require("../../models/order.model");
const moment = require("moment");
const variableConfig = require("../../config/variable");

module.exports.dashboard = async (req, res) => {
  // Section 1
  const overview = {
    totalAdmin: 0,
    totalUser: 0,
    totalOrder: 0,
    totalPrice: 0
  };

  overview.totalAdmin = await AccountAdmin.countDocuments({
    deleted: false
  });

  const orderList = await Order.find({
    deleted: false
  })

  overview.totalOrder = orderList.length;

  overview.totalPrice = orderList.reduce((sum, item) => {
    return sum + item.total;
  }, 0);
  // End Section 1

  // Section 3
  const orderNewestList = await Order.find({
    deleted: false
  })
    .sort({
      createdAt: "desc"
    })
    .limit(5);

  for (const orderDetail of orderNewestList) {
    const paymentMethod = variableConfig.paymentMethod.find(item => item.value == orderDetail.paymentMethod);
    const paymentStatus = variableConfig.paymentStatus.find(item => item.value == orderDetail.paymentStatus);
    const status = variableConfig.orderStatus.find(item => item.value == orderDetail.status);

    orderDetail.paymentMethodName = paymentMethod ? paymentMethod.label : "";
    orderDetail.paymentStatusName = paymentStatus ? paymentStatus.label : "";
    orderDetail.statusName = status ? status.label : "";
    orderDetail.createdAtTime = moment(orderDetail.createdAt).format("HH:mm");
    orderDetail.createdAtDate = moment(orderDetail.createdAt).format("DD/MM/YYYY");
  }
  // End Section 3

  res.render("admin/pages/dashboard", {
    pageTitle: "Tổng quan",
    overview: overview,
    orderNewestList: orderNewestList
  })
}

module.exports.revenueChartPost = async (req, res) => {
  const { currentMonth, currentYear, previousMonth, previousYear, arrayDay } = req.body;

  // Truy vấn tất cả đơn hàng trong tháng hiện tại
  const ordersCurrentMonth = await Order.find({
    deleted: false,
    createdAt: {
      $gte: new Date(currentYear, currentMonth - 1, 1),
      $lt: new Date(currentYear, currentMonth, 1)
    }
  })

  // Truy vấn tất cả đơn hàng trong tháng trước
  const ordersPreviousMonth = await Order.find({
    deleted: false,
    createdAt: {
      $gte: new Date(previousYear, previousMonth - 1, 1),
      $lt: new Date(previousYear, previousMonth, 1)
    }
  })

  // Tạo mảng doanh thu theo từng ngày
  const dataMonthCurrent = [];
  const dataMonthPrevious = [];

  for (const day of arrayDay) {
    // Tính tổng doanh thu theo từng ngày của tháng này
    let totalCurrent = 0;
    for (const order of ordersCurrentMonth) {
      const orderDate = new Date(order.createdAt).getDate();
      if(day == orderDate) {
        totalCurrent += order.total;
      }
    }
    dataMonthCurrent.push(totalCurrent);

    // Tính tổng doanh thu theo từng ngày của tháng trước
    let totalPrevious = 0;
    for (const order of ordersPreviousMonth) {
      const orderDate = new Date(order.createdAt).getDate();
      if(day == orderDate) {
        totalPrevious += order.total;
      }
    }
    dataMonthPrevious.push(totalPrevious);
  }

  res.json({
    code: "success",
    dataMonthCurrent: dataMonthCurrent,
    dataMonthPrevious: dataMonthPrevious
  });
}
