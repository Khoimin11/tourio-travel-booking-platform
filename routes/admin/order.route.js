const router = require('express').Router();

const orderController = require("../../controllers/admin/order.controller");

router.get('/list', orderController.list)
router.get('/trash', orderController.trash)
router.patch('/delete/:id', orderController.deletePatch)
router.patch('/change-multi', orderController.changeMultiPatch)
router.patch('/undo/:id', orderController.undoPatch)
router.patch('/delete-destroy/:id', orderController.deleteDestroyPatch)
router.patch('/trash/change-multi', orderController.trashChangeMultiPatch)

router.get('/edit/:id', orderController.edit)

router.patch('/edit/:id', orderController.editPatch)

module.exports = router;
