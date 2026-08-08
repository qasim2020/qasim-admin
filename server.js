const dotenv = require("dotenv")
dotenv.config()

const express = require("express")
const exphbs = require("express-handlebars")
const connectDB = require("./config/db")
const authRoutes = require("./routes/authRoutes")
const homeRoutes = require("./routes/homeRoutes")
const cmsRoutes = require("./routes/cmsRoutes")
const session = require('express-session');
const MongoStore = require("connect-mongo");
const path = require('path');
const hbsHelpers = require('./modules/helpers');

connectDB()

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DATABASE_URL,
        ttl: 60 * 60 * 24 * 7,
        autoRemove: 'native',
        touchAfter: 24 * 3600
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static("public"))

app.engine("hbs", exphbs.engine({ extname: ".hbs", defaultLayout: "main", helpers: hbsHelpers  }))
app.set("view engine", "hbs")
app.set("views", "./views")

app.use('/tabler', express.static(path.join(__dirname, 'node_modules', '@tabler', 'core', 'dist')));
app.use(express.static("public"))
app.use('/robots.txt', express.static(path.join(__dirname, 'static/robots.txt')));

app.use(authRoutes);
app.use(homeRoutes);
app.use(cmsRoutes);

const PORT = process.env.ADMIN_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
