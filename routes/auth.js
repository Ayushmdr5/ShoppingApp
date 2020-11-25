const express = require("express");
const { check, body } = require("express-validator");
const User = require("../models/user");

const authController = require("../controllers/auth");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
        body("password", 'Invalid password :)').isLength({ min: 5 }).isAlphanumeric().trim(),
    ],
    authController.postLogin
);

router.post("/logout", authController.postLogout);

router.post(
    "/signup",
    [
        check("email")
            .isEmail()
            .withMessage("Please enter a valid email :)")
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then((userDoc) => {
                    if (userDoc) {
                        return Promise.reject(
                            "E-mail already exists. Please pick a different one."
                        );
                    }
                });
            }).normalizeEmail(),

        body(
            "password",
            "Please enter password with atleast 5 characters with only text and numbers"
        )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),

        body("confirmPassword").custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Password have to match!");
            }
            return true;
        }),
    ],
    authController.postSignup
);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
