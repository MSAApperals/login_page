const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from 'public' directory

const port = 3000;
const users = {}; // In-memory store for OTP and request tracking

// Configure Nodemailer transport (use your own credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'msaaperals@gmail.com', // Replace with your email address
        pass: 'vddxyzteefejycaw' // Replace with the app password generated in Google
    }
});

// Serve the frontend HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to send OTP
app.post('/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const currentTime = Date.now();
    const user = users[email] || { otpCount: 0, lastRequestTime: 0 };

    // Check if the user has requested OTP 5 times
    if (user.otpCount >= 5 && (currentTime - user.lastRequestTime) < 30 * 60 * 1000) {
        return res.status(429).json({ success: false, message: 'Too many requests. Please wait 30 minutes.' });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    users[email] = { otp, otpCount: user.otpCount + 1, lastRequestTime: currentTime }; // Update OTP and request count

    console.log(`Generated OTP for ${email}: ${otp}`); // Log OTP for debugging

    const mailOptions = {
        from: 'msaaperals@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ success: false, message: 'Failed to send OTP' });
        }
        console.log('Email sent:', info.response);
        res.json({ success: true });
    });
});

// Endpoint to verify OTP
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = users[email];
    if (!user) {
        return res.status(400).json({ success: false, message: 'OTP not found for this email' });
    }

    console.log(`Received OTP verification request for ${email}`); // Log request
    console.log(`Stored OTP: ${user.otp}`); // Log stored OTP

    // Check if OTP is correct
    if (user.otp === otp) {
        delete users[email]; // Remove OTP after successful verification
        console.log(`OTP verified for ${email}`); // Log verification for debugging
        res.json({ success: true, redirectUrl: '/shopping' });
    } else {
        console.log(`Invalid OTP attempt for ${email}: ${otp}`); // Log invalid attempt
        res.json({ success: false, message: 'Invalid OTP' });
    }
});

// Serve the shopping page after successful OTP verification
app.get('/shopping', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shopping.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});
