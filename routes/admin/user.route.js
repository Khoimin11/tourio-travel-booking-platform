const router = require('express').Router();

const userController = require("../../controllers/admin/user.controller");
const multer = require("multer");
const cloudinaryHelper = require("../../helpers/cloudinary.helper");
const upload = multer({ storage: cloudinaryHelper.storage });

router.get('/list', userController.list)
router.get('/edit/:id', userController.edit)
router.patch('/edit/:id', upload.single("avatar"), userController.editPatch)
router.patch('/delete/:id', userController.deletePatch)

module.exports = router;
