const path = require("path");

const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");

const router = express.Router();

const isAuth = require("../middleware/is-auth");

// /admin/add-product => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
    "/add-product",
    [
        body("title").isString().isLength({ min: 2 }).trim(),
        body("price").isFloat().trim(),
        body("description").isLength({ min: 3 }).trim(),
    ],
    isAuth,
    adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
    "/edit-product",
    isAuth,
    [
        body("title").isString().isLength({ min: 2 }).trim(),
        body("price").isFloat().trim(),
        body("description").isLength({ min: 3 }).trim(),
    ],
    adminController.postEditProduct
);

router.delete('/product/:productId', isAuth, adminController.deleteProduct)

// router.post("/delete-product", isAuth, adminController.postDeleteProduct);

module.exports = router;
