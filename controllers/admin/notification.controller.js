const AccountAdmin = require("../../models/account-admin.model");

module.exports.markOrderNotificationsSeenPatch = async (req, res) => {
  try {
    await AccountAdmin.updateOne({
      _id: req.account.id
    }, {
      orderNotificationSeenAt: new Date()
    });

    res.json({
      code: "success"
    });
  } catch (error) {
    res.json({
      code: "error",
      message: "Khong the cap nhat trang thai thong bao!"
    });
  }
}
