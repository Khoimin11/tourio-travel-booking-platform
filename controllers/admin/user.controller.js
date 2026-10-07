const moment = require("moment");
const AccountAdmin = require("../../models/account-admin.model");
const Role = require("../../models/role.model");
const bcrypt = require("bcryptjs");
const Joi = require("joi");

module.exports.list = async (req, res) => {
  const find = {
    deleted: false
  };

  if(req.query.status) {
    find.status = req.query.status;
  }

  const dateFilter = {};

  if(req.query.startDate) {
    dateFilter.$gte = moment(req.query.startDate).startOf("date").toDate();
  }

  if(req.query.endDate) {
    dateFilter.$lte = moment(req.query.endDate).endOf("date").toDate();
  }

  if(Object.keys(dateFilter).length > 0) {
    find.createdAt = dateFilter;
  }

  if(req.query.keyword) {
    const keyword = req.query.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const keywordRegex = new RegExp(keyword, "i");
    find.$or = [
      { fullName: keywordRegex },
      { email: keywordRegex },
      { phone: keywordRegex }
    ];
  }

  const limitItems = 9;
  let page = 1;
  if(req.query.page) {
    const currentPage = parseInt(req.query.page);
    if(currentPage > 0) {
      page = currentPage;
    }
  }

  const totalRecord = await AccountAdmin.countDocuments(find);
  const totalPage = Math.ceil(totalRecord / limitItems);
  if(totalPage === 0) {
    page = 1;
  } else if(page > totalPage) {
    page = totalPage;
  }

  const skip = totalRecord > 0 ? (page - 1) * limitItems : 0;
  const pagination = {
    currentPage: page,
    skip: skip,
    totalRecord: totalRecord,
    totalPage: totalPage
  };

  const userList = await AccountAdmin
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .limit(limitItems)
    .skip(skip);

  for (const item of userList) {
    item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY");
  }

  res.render("admin/pages/user-list", {
    pageTitle: "Quản lý quản trị viên",
    userList: userList,
    pagination: pagination
  })
}

module.exports.edit = async (req, res) => {
  try {
    const accountAdminDetail = await AccountAdmin.findOne({
      _id: req.params.id,
      deleted: false
    }).select("-password");
    if(!accountAdminDetail) return res.redirect(`/${pathAdmin}/user/list`);

    const roleList = await Role.find({ deleted: false });
    res.render("admin/pages/setting-account-admin-edit", {
      pageTitle: "Chỉnh sửa quản trị viên",
      accountAdminDetail,
      roleList,
      editApi: `/${pathAdmin}/user/edit/${accountAdminDetail.id}`,
      returnUrl: `/${pathAdmin}/user/list`
    });
  } catch (error) {
    res.redirect(`/${pathAdmin}/user/list`);
  }
};

module.exports.editPatch = async (req, res) => {
  const schema = Joi.object({
    fullName: Joi.string().trim().min(5).max(50).required(),
    email: Joi.string().trim().email().required(),
    phone: Joi.string().allow(""),
    role: Joi.string().allow(""),
    positionCompany: Joi.string().allow(""),
    status: Joi.string().valid("initial", "active", "inactive").required(),
    password: Joi.string().min(8).pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).+$/).allow(""),
    avatar: Joi.any().strip()
  });
  const { error, value } = schema.validate(req.body);
  if(error) return res.json({ code: "error", message: "Thông tin không hợp lệ. Kiểm tra họ tên, email, trạng thái và mật khẩu!" });

  try {
    const id = req.params.id;
    const user = await AccountAdmin.findOne({ _id: id, deleted: false });
    if(!user) return res.json({ code: "error", message: "Quản trị viên không tồn tại!" });
    if(id === req.account.id && value.status !== "active") {
      return res.json({ code: "error", message: "Không thể dừng hoạt động tài khoản đang đăng nhập!" });
    }
    const duplicate = await AccountAdmin.findOne({ _id: { $ne: id }, email: value.email });
    if(duplicate) return res.json({ code: "error", message: "Email đã tồn tại trong hệ thống!" });
    if(value.role && !await Role.findOne({ _id: value.role, deleted: false })) {
      return res.json({ code: "error", message: "Nhóm quyền không tồn tại!" });
    }

    if(value.password) value.password = await bcrypt.hash(value.password, 10);
    else delete value.password;
    if(req.file) value.avatar = req.file.path;
    value.updatedBy = req.account.id;
    const result = await AccountAdmin.updateOne({ _id: id, deleted: false }, { $set: value });
    if(result.matchedCount === 0) return res.json({ code: "error", message: "Quản trị viên không tồn tại!" });
    req.flash("success", "Cập nhật quản trị viên thành công!");
    res.json({ code: "success" });
  } catch (error) {
    res.json({ code: "error", message: "Không thể cập nhật quản trị viên!" });
  }
};

module.exports.deletePatch = async (req, res) => {
  if(req.params.id === req.account.id) {
    return res.json({ code: "error", message: "Không thể xóa tài khoản đang đăng nhập!" });
  }
  try {
    const result = await AccountAdmin.updateOne({ _id: req.params.id, deleted: false }, {
      $set: {
        deleted: true,
        status: "inactive",
        deletedBy: req.account.id,
        deletedAt: new Date(),
        updatedBy: req.account.id
      }
    });
    if(result.matchedCount === 0) return res.json({ code: "error", message: "Quản trị viên không tồn tại!" });
    req.flash("success", "Xóa quản trị viên thành công!");
    res.json({ code: "success" });
  } catch (error) {
    res.json({ code: "error", message: "Không thể xóa quản trị viên!" });
  }
};
