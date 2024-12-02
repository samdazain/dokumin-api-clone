const express = require('express');
const router = express.Router({ mergeParams: true });

const users = require('../controllers/users');
const folders = require('../controllers/folders');
const documents = require('../controllers/documents');
const verifyEmail = require('../controllers/emailVerification');
const forgotPassword = require('../controllers/forgotPassword');
const catchAsync = require('../utils/catchAsync');

const authenticate = require('../middleware/auth');

// User routes
router.route('/signup').post(catchAsync(users.signup));
router.post('/signin', catchAsync(users.signin));
router.post('/logout', authenticate, catchAsync(users.logout));
router.get('/users/:id/profile', authenticate, catchAsync(users.getProfile));

// Folder routes
router
    .route('/users/:id/folders')
    .post(authenticate, catchAsync(folders.createFolder))
    .put(authenticate, catchAsync(folders.updateFolder))
    .delete(authenticate, catchAsync(folders.deleteFolder));

// Document routes
router
    .route('/users/:id/folders/:folderId/documents')
    .post(authenticate, catchAsync(documents.createDocument));

router
    .route('/users/:id/folders/:folderId/documents/:documentId')
    .put(authenticate, catchAsync(documents.updateDocument))
    .delete(authenticate, catchAsync(documents.deleteDocument))
    .get(authenticate, catchAsync(documents.getDocuments)) // Ambigu: gunakan rute berbeda jika getDocuments untuk semua dokumen.
    .get(authenticate, catchAsync(documents.getDetailDocument)) // Perlu konflik diatasi.
    .get(authenticate, catchAsync(documents.getSearchDocument)); // Konflik rute harus diperbaiki.

// Email verification routes
router.post('/userOTPVerifications', catchAsync(verifyEmail.sendOTPVerificationEmail));
router.post('/userOTPVerifications/resend', catchAsync(verifyEmail.resendOTPVerificationEmail));
router.post('/userOTPVerifications/verify', catchAsync(verifyEmail.verifyOTPEmail));

// Password reset routes
router.post('/passwordResetOTP/request', catchAsync(forgotPassword.requestOTPPasswordReset));
router.post('/passwordResetOTP/send', catchAsync(forgotPassword.sendOTPPasswordResetEmail));
router.post('/passwordResetOTP/reset', catchAsync(forgotPassword.resetUserPassword));
router.post('/passwordResetOTP/resend', catchAsync(forgotPassword.resendOTPPasswordReset));

module.exports = router;
