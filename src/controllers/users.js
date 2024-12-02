const Firestore = require('@google-cloud/firestore');
const hashData = require("../utils/hashData");
const { generateToken } = require("../utils/jwt");
const sendOTPVerificationEmail = require('../controllers/emailVerification');
const verifyHashedData = require("../utils/verifyHashedData");
require("dotenv").config();
const serviceAccount = require('../../serviceaccountkey.json')
// console.log(serviceAccount);

const db = new Firestore({
    projectId: serviceAccount.project_id,
    keyFilename: '../../serviceaccountkey.json',
});

const userCollection = db.collection('users');

module.exports.signup = async (req, res, next) => {
    try {
        console.log('Checking Signup Request...')

        const { email, password, name } = req.body;

        // Validasi input
        if (!email || !password || !name) {
            throw new Error("Please fill in all fields!");
        }
        if (!/^[a-zA-ZÀ-ÿ ]+$/.test(name)) {
            throw new Error("The name you entered is invalid!");
        }
        if (!/^[\w-\\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            throw new Error("The email format is invalid!");
        }
        if (password.length < 8) {
            throw new Error("Password must be at least 8 characters long!");
        }

        // Hash password
        const hashedPassword = await hashData(password);

        // Periksa apakah email sudah terdaftar
        const existingUserSnapshot = await userCollection.where('email', '==', email).get();
        if (!existingUserSnapshot.empty) {
            throw new Error("Email already in use.");
        } else {
            console.log("Email ready to use!");
        }

        // Buat entri pengguna di Firestore
        const newUserRef = userCollection.doc(); // Generate ID otomatis
        const userId = newUserRef.id;
        await newUserRef.set({
            email,
            name,
            password: hashedPassword,
            verified: false, // Belum diverifikasi
            createdAt: Date.now(),
        });

        // Kirim OTP verifikasi
        const emailData = await sendOTPVerificationEmail({ _id: userId, email });

        res.status(200).json({
            error: false,
            message: "Registration initiated. A verification email has been sent to your email address.",
            data: emailData,
        });
    } catch (error) {
        console.error("Error during signup:", error.message);
        res.status(500).json({
            error: true,
            message: "An error occurred during signup. Please try again later.",
        });
    }
};

module.exports.signin = async (req, res) => {
    try {
        let { email, password } = req.body;

        // Validasi input
        email = email.trim();
        password = password.trim();
        if (!email || !password) {
            throw new Error("Both email and password are required!");
        }

        // Ambil data pengguna berdasarkan email
        const userSnapshot = await db
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            throw new Error("Email or password is incorrect!");
        }

        const userDoc = userSnapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() };

        // Cek apakah email pengguna sudah diverifikasi
        if (!user.verified) {
            throw new Error("Email has not been verified yet. Check your inbox!");
        }

        // Verifikasi kecocokan password
        const isPasswordValid = await verifyHashedData(password, user.password);
        if (!isPasswordValid) {
            throw new Error("Email or password is incorrect!");
        }

        // Generate JWT
        const token = generateToken({ id: user.id });

        res.status(200).json({
            status: "SUCCESS",
            message: "You have successfully signed in!",
            token,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                verified: user.verified,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports.logout = (req, res) => {
    try {
        res.clearCookie('session');
        res.status(200).json({
            error: false,
            message: 'Logout successful!',
        });
    } catch (error) {
        res.status(500).json({
            message: 'An error occurred during logout.',
            error: (true, error.message)
        });
    }
};

module.exports.getProfile = async (req, res) => {
    try {
        // Ambil userId dari middleware authenticate
        const userId = req.users.userId;

        // Ambil data pengguna berdasarkan ID
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            throw new Error("User not found!");
        }

        // Ambil data pengguna dan hapus informasi sensitif
        const userData = userDoc.data();
        delete userData.password;

        res.status(200).json({
            status: "SUCCESS",
            message: "User profile fetched successfully!",
            data: { id: userDoc.id, ...userData },
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            status: "FAILED",
            message: error.message,
        });
    }
};