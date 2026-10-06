const crypto = require("crypto");
const helper = require("../../../helpers/vnpay.helper");
const params = { vnp_TmnCode: "TEST0001", vnp_Amount: "1000000", vnp_OrderInfo: "Thanh toan tour", vnp_ReturnUrl: "http://localhost:3000/order/payment-vnpay-result" };
test("URL signature matches an independent HMAC-SHA512 calculation", () => {
  const url = new URL(helper.buildUrl(params));
  const data = Object.keys(params).sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`).join("&");
  expect(url.searchParams.get("vnp_SecureHash")).toBe(crypto.createHmac("sha512", process.env.VNPAY_SECRET).update(data).digest("hex"));
  expect(url.searchParams.get("vnp_ReturnUrl")).toBe(params.vnp_ReturnUrl);
});
test("rejects a modified payment amount", () => {
  const result = Object.fromEntries(new URL(helper.buildUrl(params)).searchParams);
  result.vnp_Amount = "1";
  expect(helper.verify(result)).toBe(false);
});
