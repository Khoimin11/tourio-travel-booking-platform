// No .env, index.js, database connections or gateway requests in unit tests.
global.pathAdmin = "admin";
Object.assign(process.env, {
  NODE_ENV: "test", DATABASE: "", JWT_SECRET: "unit-test-jwt",
  VNPAY_CODE: "TEST0001", VNPAY_SECRET: "unit-test-vnpay-secret",
  VNPAY_URL: "https://vnpay.example.test/pay",
  ZALOPAY_APPID: "test-app", ZALOPAY_KEY1: "test-key-1", ZALOPAY_KEY2: "test-key-2",
  ZALOPAY_DOMAIN: "https://zalopay.example.test", DOMAIN_WEBSITE: "https://shop.example.test"
});
jest.mock("../../models/tour.model", () => require("../mocks/model.mock")());
jest.mock("../../models/category.model", () => require("../mocks/model.mock")());
jest.mock("../../models/order.model", () => require("../mocks/model.mock")());
jest.mock("../../models/city.model", () => require("../mocks/model.mock")());
jest.mock("../../models/account-admin.model", () => require("../mocks/model.mock")());
jest.mock("../../models/role.model", () => require("../mocks/model.mock")());
jest.mock("../../models/contact.model", () => require("../mocks/model.mock")());
jest.mock("../../models/forgot-password.model", () => require("../mocks/model.mock")());
jest.mock("axios", () => ({ default: { post: jest.fn(() => { throw new Error("Gateway request must be mocked"); }) } }));
jest.mock("nodemailer", () => ({ createTransport: jest.fn(() => ({ sendMail: jest.fn() })) }));
beforeEach(() => {
  for(const name of ["tour", "category", "order", "city", "account-admin", "role", "contact", "forgot-password"]) {
    const model = require(`../../models/${name}.model`);
    for(const method of ["find", "findOne", "countDocuments", "updateOne", "updateMany", "deleteOne", "deleteMany", "save"]) {
      model[method].mockReset().mockImplementation(() => { throw new Error(`Unconfigured model mock: ${name}.${method}`); });
    }
    model.mockClear();
  }
  require("axios").default.post.mockReset().mockImplementation(() => { throw new Error("Unconfigured gateway mock"); });
});
