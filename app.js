const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');

const campgrounds = require('./routes/campgrounds');
const reviews = require('./routes/reviews');

mongoose.connect('mongodb://localhost:27017/yelp-camp');

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

// Use ejs-mate as engine instead of ejs
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Tell express to parse req.body
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));  // Serve static directory

const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,  // A week from now
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(flash());

// Set up flash middleware before route handler so that we'll have access to
// locals in our template, no need to pass through in eg., redirect pages
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

// Use routes with specified prefixes
app.use('/campgrounds', campgrounds);
app.use('/campgrounds/:id/reviews', reviews);
// Note: By default, we don't have access to the 'id' param in reviews route
// Routes get separate params, unless 'mergeParams' is set to true

app.get('/', (req, res) => {
    res.render('home');
});


// For every single request -> "*" is for every path
// This will run if nothing else is matched first
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
})

// Generic error handler
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh no, something went wrong! :(';
    res.status(statusCode).render('error', { err });
})

app.listen(3000, () => {
    console.log('Serving in port 3000!');
})