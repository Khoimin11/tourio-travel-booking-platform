const router = require("express").Router();

const notificationController = require("../../controllers/admin/notification.controller");

router.patch("/order/seen", notificationController.markOrderNotificationsSeenPatch);

module.exports = router;
