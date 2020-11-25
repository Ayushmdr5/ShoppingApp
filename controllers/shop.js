const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_KEY)
// const stripe = require("stripe")(
//     "sk_test_51HbeeGCkz1VPnmqrOsLC5ItXUttFA6kyjv681N0lr2hjecIP3fHjMIddnzZpZIdzlnECdVzOc1SBLLWkQFzq6H4M00AQZ5cb3Z"
// );

const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/orders");

const ITEMS_PER_PAGE = 4;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then((numProducts) => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then((products) => {
            // console.log('fetched,', products)
            res.render("shop/product-list", {
                prods: products,
                path: "/products",
                pageTitle: "Products",
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            });
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then((numProducts) => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then((products) => {
            // console.log('fetched,', products)
            res.render("shop/index", {
                prods: products,
                path: "/",
                pageTitle: "Shop",
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            });
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
    // Product.fetchAll()
    //     .then(([rows, fieldData]) => {
    //         res.render('shop/index', {prods: rows, path:'/', pageTitle:'Shop'})
    //     })
    //     .catch(err => console.log(err))
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then((product) => {
            console.log(product);
            res.render("shop/product-detail", {
                product: product,
                pageTitle: "Product Detail",
                path: "/products",
            });
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then((product) => {
            return req.user.addToCart(product);
        })
        .then((result) => {
            console.log("from post cart:", result);
            res.redirect("/cart");
            // console.log(result);
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then((result) => {
            res.redirect("/cart");
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.getCart = (req, res, next) => {
    req.user
        .populate("cart.items.productId")
        .execPopulate()
        .then((user) => {
            console.log("user", user.cart.items);
            const products = user.cart.items;
            res.render("shop/cart", {
                pageTitle: "Your cart",
                path: "/cart",
                products: products,
            });
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate("cart.items.productId")
        .execPopulate()
        .then((user) => {
            const products = user.cart.items.map((i) => {
                return {
                    quantity: i.quantity,
                    product: { ...i.productId._doc },
                };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user,
                },
                products: products,
            });
            return order.save();
        })
        .then((result) => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect("/orders");
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.postOrder = (req, res, next) => {
    req.user
        .populate("cart.items.productId")
        .execPopulate()
        .then((user) => {
            const products = user.cart.items.map((i) => {
                return {
                    quantity: i.quantity,
                    product: { ...i.productId._doc },
                };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user,
                },
                products: products,
            });
            return order.save();
        })
        .then((result) => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect("/orders");
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.getCheckout = (req, res, next) => {
    let products;
    let total = 0;
    req.user
        .populate("cart.items.productId")
        .execPopulate()
        .then((user) => {
            products = user.cart.items;
            total = 0;
            products.forEach((p) => {
                total = total + p.quantity * p.productId.price;
            });
            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map(p => {
                    return {
                        name: p.productId.title,
                        description: p.productId.description,
                        amount: p.productId.price * 100,
                        currency: 'usd',
                        quantity: p.quantity 
                    }
                }),
                success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel',
            });
        })
        .then((session) => {
            res.render("shop/checkout", {
                pageTitle: "Checkout",
                path: "/checkout",
                products: products,
                totalSum: total,
                sessionId: session.id
            });
        })
        .catch((err) => {
            console.log(err)
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ "user.userId": req.user._id })
        .then((orders) => {
            console.log(orders);
            res.render("shop/orders", {
                pageTitle: "Your Orders",
                path: "/orders",
                orders: orders,
            });
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpstatusCode = 500;
            return next(error);
        });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
        .then((order) => {
            if (!order) {
                return next(new Error("No order found"));
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                return next(new Error("Unauthorized"));
            }
            const invoiceName = "invoice-" + orderId + ".pdf";
            const invoicePath = path.join("data", "invoices", invoiceName);

            const pdfDoc = new PDFDocument();
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                'inline; filename="' + invoiceName + '"'
            );

            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);

            pdfDoc.fontSize(26).text("Invoice", {
                underline: true,
            });

            pdfDoc.text("----------------------");
            let totalPrice = 0;
            order.products.forEach((prod) => {
                totalPrice = totalPrice + prod.quantity * prod.product.price;
                pdfDoc
                    .fontSize(14)
                    .text(
                        prod.product.title +
                            " - " +
                            prod.quantity +
                            " x " +
                            "$" +
                            prod.product.price
                    );
            });
            pdfDoc.text("-----------");
            pdfDoc.fontSize(16).text("Total Price: $" + totalPrice);
            pdfDoc.end();
            // fs.readFile(invoicePath, (err, data) => {
            //     if (err) {
            //         return next(err);
            //     }
            //     // res.contentType("application/pdf")
            //     res.setHeader("Content-Type", "application/pdf");
            //     res.setHeader(
            //         "Content-Disposition",
            //         'inline; filename="' + invoiceName + '"'
            //     );
            //     res.send(data);
            // });
        })
        .catch((err) => next(err));
};
