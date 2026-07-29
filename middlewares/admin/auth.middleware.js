const jwt = require('jsonwebtoken');
const AccountAdmin = require('../../models/account-admin.model');
const Role = require('../../models/role.model');
const Order = require('../../models/order.model');
const moment = require("moment");

module.exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if(!token) {
      res.redirect(`/${pathAdmin}/account/login`);
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, email } = decoded;

    const existAccount = await AccountAdmin.findOne({
      _id: id,
      email: email,
      status: "active"
    })

    if(!existAccount) {
      res.clearCookie("token");
      res.redirect(`/${pathAdmin}/account/login`);
      return;
    }

    const role = await Role.findOne({
      _id: existAccount.role
    })

    existAccount.roleName = role.name;

    req.account = existAccount;

    req.permissions = role.permissions;

    let unreadOrderNotificationCount = 0;
    let orderNotificationList = [];

    if(!existAccount.orderNotificationSeenAt) {
      existAccount.orderNotificationSeenAt = new Date();
      await existAccount.save();
    } else {
      unreadOrderNotificationCount = await Order.countDocuments({
        deleted: false,
        createdAt: {
          $gt: existAccount.orderNotificationSeenAt
        }
      });

      orderNotificationList = await Order.find({
        deleted: false,
        createdAt: {
          $gt: existAccount.orderNotificationSeenAt
        }
      })
        .sort({
          createdAt: "desc"
        })
        .limit(10)
        .select("id orderCode fullName createdAt");
    }

    for (const item of orderNotificationList) {
      item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY");
    }

    res.locals.account = existAccount;

    res.locals.permissions = role.permissions;
    res.locals.orderNotificationList = orderNotificationList;
    res.locals.unreadOrderNotificationCount = unreadOrderNotificationCount;

    next();
  } catch (error) {
    res.clearCookie("token");
    res.redirect(`/${pathAdmin}/account/login`);
  }
}
