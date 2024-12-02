require("dotenv").config();
require("./app");

const app = require("express")();
const express = require("express");
const cors = require("cors");
const path = require("path");
const port = process.env.PORT || 5000;

const ExpressError = require('./utils/expressError');

const userRoutes = require('./controllers/users');
const emailVerificationRoutes = require('./controllers/emailVerification');
const forgotPasswordRoutes = require('./controllers/forgotPassword');
const folderRoutes = require('./controllers/folders');
const documentRoutes = require('./controllers/documents');
const cookieParser = require('cookie-parser');

app.engine('.html', require('ejs').__express);
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(cors());
app.use(express.json());

app.use('/', () => userRoutes);
app.use('/folders', () => folderRoutes);
app.use('/documents', () => documentRoutes);
app.use('/userOTPVerifications', () => emailVerificationRoutes);
app.use('/passworResetOTPs', () => forgotPasswordRoutes);

app.get('/', (req, res) => {
    res.json({ msg: 'Home' });
});

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
});

app.use((err, req, res, next) => {
    const { status = 500, message = 'Something went wrong', stack } = err;
    if (!err.message) {
        err.message = 'Something went wrong';
    }
    res.status(status).json({ error: true, message, stack });
});

//                      FIRESTORE INITIALIZATION
const admin = require("firebase-admin");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccountPath = path.resolve(process.env.CLOUD_FIRESTORE_CREDENTIAL);
const serviceAccount = require(serviceAccountPath);

initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.PROJECT_ID}.firebaseio.com`,
});

const db = getFirestore();
console.log("Connected to Firestore!"); // use ("...", db) for read the db instance

app.listen(port, () => {
    console.log('Server run on', port);
});

// =================================================================

module.exports = { app, db, serviceAccount };