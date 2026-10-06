const Contact = require("../../../models/contact.model");
const contact = require("../../../controllers/client/contact.controller");
const { request, response } = require("../../mocks/http.mock");
test("duplicate newsletter subscription does not create a record", async () => {
  Contact.findOne.mockResolvedValue({ email: "test@example.test" }); const res = response();
  await contact.createPost(request({ body: { email: "test@example.test" } }), res);
  expect(Contact.save).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "error" }));
});
test("new newsletter subscription is saved", async () => {
  Contact.findOne.mockResolvedValue(null); Contact.save.mockResolvedValue(); const res = response();
  await contact.createPost(request({ body: { email: "test@example.test" } }), res);
  expect(Contact.mock.instances[0].email).toBe("test@example.test"); expect(res.json).toHaveBeenCalledWith({ code: "success" });
});
