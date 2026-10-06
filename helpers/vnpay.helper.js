const crypto = require("crypto");
const qs = require("qs");
const sortHelper = require("./sort.helper");

const encode = params => qs.stringify(sortHelper.sortObject(params), { encode: false });
const sign = params => crypto.createHmac("sha512", process.env.VNPAY_SECRET)
  .update(encode(params), "utf8").digest("hex");

module.exports.buildUrl = params => `${process.env.VNPAY_URL}?${encode(params)}&vnp_SecureHash=${sign(params)}`;

module.exports.verify = query => {
  const params = { ...query };
  const hash = params.vnp_SecureHash;
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  if(typeof hash !== "string" || !/^[a-f0-9]{128}$/i.test(hash) ||
    Object.values(params).some(value => typeof value !== "string")) return false;
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(sign(params), "hex"));
};
