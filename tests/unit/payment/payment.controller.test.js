const crypto = require("crypto");
const Order = require("../../../models/order.model");
const axios = require("axios").default;
const controller = require("../../../controllers/client/order.controller");
const { request, response } = require("../../mocks/http.mock");
const signVNPay = params => {
  const data = Object.keys(params).sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`).join("&");
  return { ...params, vnp_SecureHash: crypto.createHmac("sha512", process.env.VNPAY_SECRET).update(data).digest("hex") };
};
let order;
beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  order = { id: "order-id", phone: "0377000000", total: 10000, paymentStatus: "unpaid", vnpayTransactionId: "vnp-txn", zalopayTransactionId: "zlp-txn" };
  Order.findOne.mockResolvedValue(order); Order.updateOne.mockResolvedValue({ modifiedCount: 1 });
});
const vnp = changes => signVNPay({ vnp_TmnCode: "TEST0001", vnp_TxnRef: "vnp-txn", vnp_Amount: "1000000", vnp_ResponseCode: "00", vnp_TransactionStatus: "00", ...changes });
const zlp = changes => {
  const params = { orderId: "order-id", phone: "0377000000", appid: "test-app", apptransid: "zlp-txn", pmcid: "38", bankcode: "", amount: "10000", discountamount: "0", status: "1", ...changes };
  const data = ["appid", "apptransid", "pmcid", "bankcode", "amount", "discountamount", "status"].map(key => params[key]).join("|");
  return { ...params, checksum: crypto.createHmac("sha256", process.env.ZALOPAY_KEY2).update(data).digest("hex") };
};
test("VNPay IPN records verified successful payment", async () => {
  const res = response(); await controller.paymentVNPayIPN(request({ query: vnp() }), res);
  expect(Order.updateOne).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "unpaid", vnpayResponseCode: { $exists: false } }), { $set: { paymentStatus: "paid", vnpayResponseCode: "00" } });
  expect(res.json).toHaveBeenCalledWith({ RspCode: "00", Message: "Success" });
});
test.each([
  ["invalid checksum", () => ({ ...vnp(), vnp_SecureHash: "invalid" }), "97"],
  ["wrong amount", () => vnp({ vnp_Amount: "1" }), "04"]
])("IPN rejects %s before writing", async (name, query, code) => {
  const res = response(); await controller.paymentVNPayIPN(request({ query: query() }), res);
  expect(Order.updateOne).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ RspCode: code }));
});
test("repeated paid IPN returns 02 without writing", async () => {
  const state = { paymentStatus: "paid" };
  Object.assign(order, state); const res = response(); await controller.paymentVNPayIPN(request({ query: vnp() }), res);
  expect(Order.updateOne).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ RspCode: "02" }));
});
test("Return URL never updates payment status", async () => {
  const res = response(); await controller.paymentVNPayResult(request({ query: vnp() }), res);
  expect(Order.updateOne).not.toHaveBeenCalled(); expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("/order/success?"));
});
test("cancelled VNPay payment returns to cart", async () => {
  const res = response(); await controller.paymentVNPayResult(request({ query: vnp({ vnp_ResponseCode: "24", vnp_TransactionStatus: "02" }) }), res);
  expect(Order.updateOne).not.toHaveBeenCalled(); expect(res.redirect).toHaveBeenCalledWith("/cart");
});
test("VNPay request includes expiry and uses the current browser host", async () => {
  const res = response(); await controller.paymentVNPay(request({ query: { orderId: "order-id" } }), res);
  const url = new URL(res.redirect.mock.calls[0][0]);
  expect(url.searchParams.get("vnp_ReturnUrl")).toBe("http://localhost:3000/order/payment-vnpay-result");
  expect(url.searchParams.get("vnp_ExpireDate")).toMatch(/^\d{14}$/);
  expect(url.searchParams.get("vnp_Amount")).toBe("1000000");
});
test("cancelled ZaloPay payment returns to cart without gateway requests", async () => {
  const res = response(); await controller.paymentZaloPayReturn(request({ query: zlp({ status: "-1" }) }), res);
  expect(axios.post).not.toHaveBeenCalled(); expect(Order.updateOne).not.toHaveBeenCalled(); expect(res.redirect).toHaveBeenCalledWith("/cart");
});
test("ZaloPay verifies with query API when callback is delayed", async () => {
  axios.post.mockResolvedValue({ data: { return_code: 1, amount: 10000 } }); const res = response();
  await controller.paymentZaloPayReturn(request({ query: zlp() }), res);
  expect(Order.updateOne).toHaveBeenCalledWith(expect.any(Object), { $set: { paymentStatus: "paid" } });
  expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("/order/success?"));
});
test("ZaloPay query with wrong amount cannot mark paid", async () => {
  const data = { return_code: 1, amount: 1 };
  axios.post.mockResolvedValue({ data }); const res = response(); await controller.paymentZaloPayReturn(request({ query: zlp() }), res);
  expect(Order.updateOne).not.toHaveBeenCalled(); expect(res.redirect).toHaveBeenCalledWith("/cart");
});
test("ZaloPay rejects callbacks with a bad MAC", async () => {
  const res = response(); await controller.paymentZaloPayResultPost(request({ body: { data: "{}", mac: "invalid" } }), res);
  expect(Order.updateOne).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ return_code: -1 }));
});
test("ZaloPay signed callback marks paid", async () => {
  const data = JSON.stringify({ app_user: "0377000000-aaaaaaaaaaaaaaaaaaaaaaaa" });
  const mac = crypto.createHmac("sha256", process.env.ZALOPAY_KEY2).update(data).digest("hex");
  const res = response(); await controller.paymentZaloPayResultPost(request({ body: { data, mac } }), res);
  expect(Order.updateOne).toHaveBeenCalledWith({ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", phone: "0377000000", deleted: false }, { paymentStatus: "paid" });
  expect(res.json).toHaveBeenCalledWith({ return_code: 1, return_message: "success" });
});
