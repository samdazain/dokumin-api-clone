const admin = require('firebase-admin');
const db = require("../app");
const generateOTP = require("../utils/generateOTP");
const verifyHashedData = require("../utils/verifyHashedData");
const hashData = require("../utils/hashData");
const sendEmail = require("../utils/sendEmail");

const sendOTPVerificationEmail = async ({ _id, email }) => {
    try {
        const otp = await generateOTP();
        console.log("Generated OTP:", otp);

        // Email options
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "Verify Your Email Address",
            html: `
        <p>Enter <b>${otp}</b> to complete your account setup and login.</p>
        <p>This code <b>expires in 60 minutes</b>.</p>
        <p>Team Dokumin ❤️</p>
      `,
        };

        const hashedOTP = await hashData(otp);
        console.log("Hashed OTP:", hashedOTP);

        const verificationRecord = {
            userId: _id,
            otp: hashedOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000, // 1 hour
        };

        // Save OTP verification to Firestore
        const verificationRef = db.collection("userOTPVerifications").doc(_id);
        await verificationRef.set(verificationRecord);

        // Send email
        await sendEmail(mailOptions);
        console.log("Email sent successfully!");
        return {
            userId: _id,
            email,
        };
    } catch (error) {
        console.error("Error sending OTP verification email:", error);
        throw error;
    }
};

const verifyOTPEmail = async (userId, otp) => {
    try {
        const verificationRef = db.collection("userOTPVerifications").doc(userId);
        const doc = await verificationRef.get();

        if (!doc.exists) {
            throw new Error("No verification record found or already verified.");
        }

        const { expiresAt, otp: hashedOTP } = doc.data();

        // Periksa apakah OTP telah kedaluwarsa
        if (expiresAt < Date.now()) {
            await verificationRef.delete(); // Hapus data OTP kedaluwarsa
            throw new Error("The OTP code has expired. Please request a new one.");
        }

        // Verifikasi OTP
        const isValid = await verifyHashedData(otp, hashedOTP);
        if (!isValid) {
            throw new Error("Invalid OTP. Please check your inbox and try again.");
        }

        // Tandai pengguna sebagai terverifikasi
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error("User not found.");
        }

        const { email, password, verified } = userDoc.data();

        if (verified) {
            throw new Error("User is already verified.");
        }

        // Update status pengguna di Firestore
        await userRef.update({ verified: true });

        // Buat pengguna di Firebase Authentication
        await admin.auth().createUser({
            email: email,
            password: password,
        });

        // Hapus data OTP setelah berhasil diverifikasi
        await verificationRef.delete();

        return { message: "User verified and registration completed successfully!" };
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const resendOTPVerificationEmail = async (userId, email) => {
    try {
        const verificationRef = db.collection("userOTPVerifications").doc(userId);
        await verificationRef.delete(); // Remove old records

        // Send new OTP
        const emailData = await sendOTPVerificationEmail({ _id: userId, email });
        return emailData;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

module.exports = {
    verifyOTPEmail,
    sendOTPVerificationEmail,
    resendOTPVerificationEmail,
};
