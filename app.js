const path = require("path");
const fs = require("fs");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const errorController = require("./controllers/error");
// const mongoConnect = require("./util/database").mongoConnect;
const User = require("./models/user");

console.log(process.env.NODE_ENV);

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.olkcn.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;
// "mongodb+srv://Ayushmdr:mongodb123@cluster0.olkcn.mongodb.net/shop";

const app = express();

const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: "sessions",
});

const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images");
    },
    filename: (req, file, cb) => {
        cb(
            null,
            Math.floor(Math.random() * 100000 + 1) + "-" + file.originalname
        );

        // cb(null, file.originalname);
        // cb(null, new Date().toISOString() + '-' + file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, "access.log"),
    { flags: "a" }
);

app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(
    session({
        secret: "my secret",
        resave: false,
        saveUninitialized: false,
        store: store,
    })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    if (!req.session.user) {
        console.log("no session from 'app.js'");
        return next();
    }
    User.findById(req.session.user._id)
        .then((user) => {
            if (!user) {
                return next();
            }
            // console.log('from app', req.csrfToken())
            req.user = user;
            // console.log('from app', req.user, req.session)
            next();
        })
        .catch((err) => {
            console.log("from app error");
            next(new Error(err));
        });
});

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn; // using locals so that all view can access "isAuthenticated" & "csrfToken"
    res.locals.csrfToken = req.csrfToken();
    next();
});

// app.use((req, res, next) => {
//     User.findById("5f70232e1a76eb0d54124021")
//         .then((user) => {
//             req.user = user;
//             next();
//         })
//         .catch((err) => console.log(err));
// });

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// app.get("/500", errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
    // console.log('from hehe', req.session)
    // console.log('from hehe', req.csrfToken())
    console.log(error);
    console.log("from app 500 error");
    res.status(500).render("500", {
        pageTitle: "Error",
        path: "/500",
        isAuthenticated: req.session.isLoggedIn,
        // csrfToken: 'req.csrfToken()'
    });
});

mongoose
    .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((result) => {
        app.listen(process.env.PORT || 3000);
        console.log("Connected!");
    })
    .catch((err) => console.log(err));

//?retryWrites=true&w=majority

//  api_key: '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'
