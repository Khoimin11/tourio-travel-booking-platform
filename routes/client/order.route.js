const router = require('express').Router();

const orderController = require("../../controllers/client/order.controller");

router.post('/create', orderController.createPost)

router.get('/success', orderController.success)

router.get('/payment-zalopay', orderController.paymentZaloPay)
router.get('/payment-zalopay-return', orderController.paymentZaloPayReturn)

router.post('/payment-zalopay-result', orderController.paymentZaloPayResultPost)

router.get('/payment-vnpay', orderController.paymentVNPay)

router.get('/payment-vnpay-result', orderController.paymentVNPayResult)
router.get('/payment-vnpay-ipn', orderController.paymentVNPayIPN)

module.exports = router;
