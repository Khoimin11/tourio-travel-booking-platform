const Tour = require("../../models/tour.model");
const Order = require("../../models/order.model");
const City = require("../../models/city.model");

const variableConfig = require("../../config/variable");
const gererateHelper = require("../../helpers/generate.helper");
const vnpayHelper = require("../../helpers/vnpay.helper");
const crypto = require("crypto");

const axios = require('axios').default; // npm install axios
const CryptoJS = require('crypto-js'); // npm install crypto-js
const moment = require("moment");

module.exports.createPost = async (req, res) => {
  try {
    req.body.orderCode = "OD" + gererateHelper.generateRandomNumber(10);

    // Danh sách tour
    for (const item of req.body.items) {
      const infoTour = await Tour.findOne({
        _id: item.tourId,
        status: "active",
        deleted: false
      })

      if(infoTour) {
        // Thêm giá
        item.priceNewAdult = infoTour.priceNewAdult;
        item.priceNewChildren = infoTour.priceNewChildren;
        item.priceNewBaby = infoTour.priceNewBaby;

        // Ngày khởi hành
        item.departureDate = infoTour.departureDate;

        // Ảnh
        item.avatar = infoTour.avatar;

        // Tiêu đề
        item.name = infoTour.name;

        // Cập nhật lại số lượng còn lại của tour
        if(infoTour.stockAdult < item.quantityAdult || infoTour.stockChildren < item.quantityChildren || infoTour.stockBaby < item.quantityBaby) {
          res.json({
            code: "error",
            message: `Số lượng chỗ của tour ${item.name} đã hết, vui lòng chọn lại`
          })
          return;
        }

        await Tour.updateOne({
          _id: item.tourId
        }, {
          stockAdult: infoTour.stockAdult - item.quantityAdult,
          stockChildren: infoTour.stockChildren - item.quantityChildren,
          stockBaby: infoTour.stockBaby - item.quantityBaby,
        })
      }
    }

    // Thanh toán
    // Tạm tính
    req.body.subTotal = req.body.items.reduce((sum, item) => {
      return sum + ((item.priceNewAdult * item.quantityAdult) + (item.priceNewChildren * item.quantityChildren) + (item.priceNewBaby * item.quantityBaby));
    }, 0);

    // Giảm
    req.body.discount = 0;

    // Thanh toán
    req.body.total = req.body.subTotal - req.body.discount;

    // Trạng thái thanh toán
    req.body.paymentStatus = "unpaid"; // unpaid: chưa thánh toán, paid: đã thanh toán

    // Trạng thái đơn hàng
    req.body.status = "initial"; // initial: khởi tạo, done: hoàn thành, cancel: hủy

    const newRecord = new Order(req.body);
    await newRecord.save();

    res.json({
      code: "success",
      message: "Đặt hàng thành công!",
      orderId: newRecord.id
    })
  } catch (error) {
    console.log(error);

    res.json({
      code: "error",
      message: "Đặt hàng không thành công!"
    })
  }
}

module.exports.success = async (req, res) => {
  try {
    const { orderId, phone } = req.query;

    const orderDetail = await Order.findOne({
      _id: orderId,
      phone: phone
    })

    if(!orderDetail) {
      res.redirect("/");
      return;
    }

    orderDetail.paymentMethodName = variableConfig.paymentMethod.find(item => item.value == orderDetail.paymentMethod).label;

    orderDetail.paymentStatusName = variableConfig.paymentStatus.find(item => item.value == orderDetail.paymentStatus).label;

    orderDetail.statusName = variableConfig.orderStatus.find(item => item.value == orderDetail.status).label;

    orderDetail.createdAtFormat = moment(orderDetail.createdAt).format("HH:mm - DD/MM/YYYY");

    for (const item of orderDetail.items) {
      const infoTour = await Tour.findOne({
        _id: item.tourId,
        deleted: false
      })

      if(infoTour) {
        item.slug = infoTour.slug;
      }

      item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");

      const city = await City.findOne({
        _id: item.locationFrom
      })

      if(city) {
        item.locationFromName = city.name;
      }
    }

    res.render("client/pages/order-success", {
      pageTitle: "Đặt hàng thành công",
      orderDetail: orderDetail
    });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
}

module.exports.paymentZaloPay = async (req, res) => {
  try {
    const orderId = req.query.orderId;
  
    const orderDetail = await Order.findOne({
      _id: orderId,
      paymentStatus: "unpaid",
      deleted: false
    });

    if(!orderDetail) {
      res.redirect("/");
      return;
    }

    // APP INFO
    const config = {
      app_id: process.env.ZALOPAY_APPID,
      key1: process.env.ZALOPAY_KEY1,
      key2: process.env.ZALOPAY_KEY2,
      endpoint: `${process.env.ZALOPAY_DOMAIN}/v2/create`
    };

    const embed_data = {
      redirecturl: `${req.protocol}://${req.get("host")}/order/payment-zalopay-return?${new URLSearchParams({ orderId: orderDetail.id, phone: orderDetail.phone })}`
    };

    const items = [{}];
    const transID = Math.floor(Math.random() * 1000000);
    const order = {
      app_id: config.app_id,
      app_trans_id: `${moment().format('YYMMDD')}_${transID}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
      app_user: `${orderDetail.phone}-${orderDetail.id}`,
      app_time: Date.now(), // miliseconds
      item: JSON.stringify(items),
      embed_data: JSON.stringify(embed_data),
      amount: orderDetail.total,
      description: `Thanh toán đơn hàng ${orderDetail.orderCode}`,
      bank_code: "",
      callback_url: `${process.env.DOMAIN_WEBSITE}/order/payment-zalopay-result`
    };

    // appid|app_trans_id|appuser|amount|apptime|embeddata|item
    const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    await Order.updateOne({ _id: orderDetail.id, paymentStatus: "unpaid", deleted: false }, {
      $set: { zalopayTransactionId: order.app_trans_id }
    });
    const response = await axios.post(config.endpoint, null, { params: order, timeout: 10000 });
    if(response.data.return_code == 1) {
      res.redirect(response.data.order_url);
    } else {
      res.redirect("/cart");
    }
  } catch (error) {
    res.redirect("/cart");
  }
}

module.exports.paymentZaloPayReturn = async (req, res) => {
  try {
    const { orderId, phone } = req.query;
    const orderDetail = await Order.findOne({
      _id: orderId, phone, paymentMethod: "zalopay", deleted: false
    });
    if(!orderDetail) return res.redirect("/cart");

    if(orderDetail.paymentStatus !== "paid") {
      if(req.query.status !== "1") return res.redirect("/cart");
      const fields = ["appid", "apptransid", "pmcid", "bankcode", "amount", "discountamount", "status"];
      const checksumData = fields.map(field => req.query[field] ?? "").join("|");
      const checksum = CryptoJS.HmacSHA256(checksumData, process.env.ZALOPAY_KEY2).toString();
      if(checksum !== req.query.checksum || req.query.appid !== process.env.ZALOPAY_APPID ||
        req.query.apptransid !== orderDetail.zalopayTransactionId) return res.redirect("/cart");

      // Verify with ZaloPay if its callback has not reached the website yet.
      const params = {
        app_id: process.env.ZALOPAY_APPID,
        app_trans_id: orderDetail.zalopayTransactionId
      };
      params.mac = CryptoJS.HmacSHA256(`${params.app_id}|${params.app_trans_id}|${process.env.ZALOPAY_KEY1}`, process.env.ZALOPAY_KEY1).toString();
      const response = await axios.post(`${process.env.ZALOPAY_DOMAIN}/v2/query`, null, { params, timeout: 10000 });
      if(response.data.return_code !== 1 || Number(response.data.amount) !== orderDetail.total) {
        return res.redirect("/cart");
      }
      await Order.updateOne({ _id: orderDetail.id, deleted: false, paymentStatus: "unpaid" }, {
        $set: { paymentStatus: "paid" }
      });
    }

    res.redirect(`/order/success?${new URLSearchParams({ orderId: orderDetail.id, phone: orderDetail.phone })}`);
  } catch (error) {
    res.redirect("/cart");
  }
};

module.exports.paymentZaloPayResultPost = async (req, res) => {
  const config = {
    key2: process.env.ZALOPAY_KEY2
  };

  let result = {};

  try {
    let dataStr = req.body.data;
    let reqMac = req.body.mac;

    let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
    console.log("mac =", mac);


    // kiểm tra callback hợp lệ (đến từ ZaloPay server)
    if (reqMac !== mac) {
      // callback không hợp lệ
      result.return_code = -1;
      result.return_message = "mac not equal";
    }
    else {
      // thanh toán thành công
      let dataJson = JSON.parse(dataStr, config.key2);
      const [ phone, orderId ] = dataJson.app_user.split("-");

      await Order.updateOne({
        _id: orderId,
        phone: phone,
        deleted: false
      }, {
        paymentStatus: "paid"
      })

      result.return_code = 1;
      result.return_message = "success";
    }
  } catch (ex) {
    result.return_code = 0; // ZaloPay server sẽ callback lại (tối đa 3 lần)
    result.return_message = ex.message;
  }

  // thông báo kết quả cho ZaloPay server
  res.json(result);
}

module.exports.paymentVNPay = async (req, res) => {
  try {
    const orderId = req.query.orderId;
  
    const orderDetail = await Order.findOne({
      _id: orderId,
      paymentStatus: "unpaid",
      paymentMethod: "vnpay",
      deleted: false
    });

    if(!orderDetail) {
      res.redirect("/");
      return;
    }

    const date = moment().utcOffset(7);
    const createDate = date.format('YYYYMMDDHHmmss');
    
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "127.0.0.1";
    const ipAddr = rawIp.split(",")[0].trim().replace(/^::ffff:/, "").replace(/^::1$/, "127.0.0.1");
    
    let tmnCode = process.env.VNPAY_CODE;
    const returnUrl = `${req.protocol}://${req.get("host")}/order/payment-vnpay-result`;
    const orderIdVNP = `${orderId}${Date.now()}${crypto.randomBytes(3).toString("hex")}`;
    let amount = orderDetail.total;
    let bankCode = "";
    
    let locale = "vn";
    let currCode = 'VND';
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderIdVNP;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderIdVNP;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    vnp_Params['vnp_ExpireDate'] = date.clone().add(15, "minutes").format('YYYYMMDDHHmmss');
    if(bankCode !== null && bankCode !== ''){
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    await Order.updateOne({ _id: orderId, paymentStatus: "unpaid", deleted: false }, {
      $set: { vnpayTransactionId: orderIdVNP },
      $unset: { vnpayResponseCode: "" }
    });
    res.redirect(vnpayHelper.buildUrl(vnp_Params));
  } catch (error) {
    res.redirect("/");
  }
}

module.exports.paymentVNPayResult = async (req, res) => {
  try {
    const params = req.query;
    if(!vnpayHelper.verify(params) || params.vnp_TmnCode !== process.env.VNPAY_CODE) return res.redirect("/cart");
    const orderDetail = await Order.findOne({
      vnpayTransactionId: params.vnp_TxnRef, paymentMethod: "vnpay", deleted: false
    });
    if(!orderDetail || Number(params.vnp_Amount) !== orderDetail.total * 100 ||
      params.vnp_ResponseCode !== "00" || params.vnp_TransactionStatus !== "00") return res.redirect("/cart");
    // The IPN endpoint updates payment status; this endpoint only displays it.
    res.redirect(`/order/success?${new URLSearchParams({ orderId: orderDetail.id, phone: orderDetail.phone })}`);
  } catch (error) {
    res.redirect("/cart");
  }
};

module.exports.paymentVNPayIPN = async (req, res) => {
  try {
    const params = req.query;
    if(!vnpayHelper.verify(params) || params.vnp_TmnCode !== process.env.VNPAY_CODE) {
      return res.json({ RspCode: "97", Message: "Invalid checksum" });
    }
    const orderDetail = await Order.findOne({
      vnpayTransactionId: params.vnp_TxnRef, paymentMethod: "vnpay", deleted: false
    });
    if(!orderDetail) return res.json({ RspCode: "01", Message: "Order not found" });
    if(Number(params.vnp_Amount) !== orderDetail.total * 100) return res.json({ RspCode: "04", Message: "Invalid amount" });
    if(orderDetail.paymentStatus === "paid" || orderDetail.vnpayResponseCode !== undefined) {
      return res.json({ RspCode: "02", Message: "Order already confirmed" });
    }
    if(!params.vnp_ResponseCode || !params.vnp_TransactionStatus) return res.json({ RspCode: "99", Message: "Missing transaction result" });
    const update = { vnpayResponseCode: params.vnp_ResponseCode };
    if(params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00") update.paymentStatus = "paid";
    const result = await Order.updateOne({
      _id: orderDetail.id, vnpayTransactionId: params.vnp_TxnRef, deleted: false,
      paymentStatus: "unpaid", vnpayResponseCode: { $exists: false }
    }, { $set: update });
    res.json(result.modifiedCount > 0
      ? { RspCode: "00", Message: "Success" }
      : { RspCode: "02", Message: "Order already confirmed" });
  } catch (error) {
    res.json({ RspCode: "99", Message: "Internal error" });
  }
};
