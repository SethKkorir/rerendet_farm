import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import generateToken, { 
  generateAccessToken, 
  generateRefreshToken, 
  setRefreshTokenCookie, 
  clearRefreshTokenCookie,
  setTokenCookie,
  clearTokenCookie
} from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import { getVerificationEmail, getWelcomeEmail, getResetPasswordEmail, getRegretEmail, getSecurityAlertEmail } from '../utils/emailTemplates.js';
import { logActivity } from '../utils/activityLogger.js';
import ActivityLog from '../models/ActivityLog.js';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import { checkPasswordStrength } from '../utils/passwordValidator.js';

const parseUserAgent = (uaString) => {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  const ua = uaString || '';

  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr|opera/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/edge|edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/windows|win32/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { browser, os };
};

const handleDeviceFingerprint = async (req, user) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown IP';
  const uaString = req.headers['user-agent'] || 'Unknown User-Agent';
  const { browser, os } = parseUserAgent(uaString);

  const isKnown = user.knownDevices && user.knownDevices.some(
    dev => dev.ip === ip && dev.userAgent === uaString
  );

  if (!isKnown) {
    console.log(`🔍 New login device detected for ${user.email} (IP: ${ip}, UA: ${uaString})`);
    
    user.knownDevices = user.knownDevices || [];
    user.knownDevices.push({
      ip,
      userAgent: uaString,
      location: 'Nairobi, Kenya',
      verifiedAt: new Date()
    });
    await user.save({ validateBeforeSave: false });
    
    try {
      let logoUrl;
      try {
        const settings = await Settings.getSettings();
        logoUrl = settings?.store?.logo;
      } catch (err) {}

      const alertMessage = `We detected a login from a new device/browser (${browser} on ${os}) for your account from IP address ${ip}. If this was you, no action is needed. If this wasn't you, please freeze your account immediately by resetting your password.`;
      
      await sendEmail({
        to: user.email,
        subject: '⚠️ Security Alert: New Device Login Detected',
        html: getSecurityAlertEmail(user.firstName, alertMessage, logoUrl)
      });
    } catch (emailErr) {
      console.error('Failed to send device login alert email:', emailErr);
    }
  }
};

// ==================== CUSTOMER AUTH ====================

// @desc    Verify 2FA Code and Login
// @route   POST /api/auth/verify-2fa
// @access  Public
const verify2FALogin = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  console.log(`🔐 2FA Attempt for: ${email} | Code Received: [${code}]`);

  const user = await User.findOne({ email }).select('+verificationCode +verificationCodeExpires +role +userType +isVerified +wallet +shippingInfo +cart +twoFactorEnabled +adminPermissions');

  if (!user) {
    console.error(`❌ 2FA Failure: User ${email} not found`);
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  // Coerce both to string and trim to prevent type/whitespace mismatch
  const dbCode = String(user.verificationCode || '').trim();
  const inputCode = String(code || '').trim();
  const isExpired = user.verificationCodeExpires < Date.now();

  console.log(`🔍 2FA Match Check: Input:[${inputCode}] | DB:[${dbCode}] | Expired: ${isExpired}`);

  if (dbCode !== inputCode || isExpired) {
    console.error(`❌ 2FA Failure: Code mismatch or expired for ${email}`);
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  // STRICT SEPARATION CHECK
  const isTryAdminPath = req.originalUrl.includes('/admin/');
  const isAdmin = user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin';

  if (isTryAdminPath && !isAdmin) {
    res.status(403);
    throw new Error('This account does not have administrator privileges.');
  }

  if (!isTryAdminPath && isAdmin) {
    res.status(403);
    throw new Error('Administrators must log in via the Admin Portal.');
  }

  // Clear code
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // LOG ACTIVITY IF ADMIN
  if (isAdmin) {
    await logActivity(req, 'LOGIN', `${user.firstName} (via 2FA)`, user._id, {
      method: '2FA_VERIFICATION',
      ip: req.ip,
      email: user.email
    });
  }

  console.log(`✅ 2FA Success for: ${email}`);

  // LOG ACTIVITY IF CUSTOMER
  // (We don't log customer activity to the admin security dashboard to prevent log bloat and spam alerts)

  // Verify device fingerprint asynchronously
  handleDeviceFingerprint(req, user).catch(err => console.error('Device fingerprint error:', err));

  const accessToken = generateAccessToken(user._id, user.tokenVersion || 0);
  const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0);
  setTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        role: user.role,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        shippingInfo: user.shippingInfo || {},
        wallet: user.wallet || {},
        cart: user.cart || [],

        twoFactorEnabled: user.twoFactorEnabled,
        permissions: user.adminPermissions // Crucial for Admin UI
      },
      token: accessToken
    }
  });
});

// @desc    Toggle 2FA
// @route   PUT /api/auth/toggle-2fa
// @access  Private
const toggle2FA = asyncHandler(async (req, res) => {
  const { enabled, password } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!await user.comparePassword(password)) {
    res.status(401);
    throw new Error('Incorrect password');
  }

  user.twoFactorEnabled = enabled;
  await user.save();

  // SEND ALERT
  try {
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (e) { }

    await sendEmail({
      to: user.email,
      subject: `Security Alert: 2FA ${enabled ? 'Enabled' : 'Disabled'}`,
      html: getSecurityAlertEmail(user.firstName, `Two-Factor Authentication was ${enabled ? 'Enabled' : 'Disabled'}`, logoUrl)
    });
  } catch (err) { }

  res.json({
    success: true,
    message: `Two-Factor Authentication ${enabled ? 'enabled' : 'disabled'}`
  });
});

// Customer registration
const registerCustomer = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, gender, dateOfBirth, userType = 'customer' } = req.body;

  console.log(`👤 Customer registration attempt:`, email);

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  // Validate password strength using zxcvbn
  const strength = checkPasswordStrength(password, email);
  if (strength.score < 3) {
    res.status(400);
    throw new Error(`Password too weak! ${strength.feedback} (Strength Score: ${strength.score}/4)`);
  }

  // Validate age if dateOfBirth provided
  if (dateOfBirth) {
    const age = Math.floor((new Date() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 13) {
      res.status(400);
      throw new Error('You must be at least 13 years old to create an account');
    }
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Create customer user
  const userData = {
    firstName,
    lastName,
    email,
    password,
    phone,
    userType: 'customer',
    role: 'customer'
  };

  // Only add optional fields if they have value (prevents enum/validation errors for empty strings)
  if (gender && gender.trim()) userData.gender = gender;
  if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
  else if (req.body.dob) userData.dateOfBirth = req.body.dob;

  const newUser = await User.create(userData);

  // Generate verification code
  const verificationCode = newUser.generateVerificationCode();
  await newUser.save({ validateBeforeSave: false });

  try {


    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    // Send verification email
    const emailHtml = getVerificationEmail(firstName, verificationCode, logoUrl);

    await sendEmail({
      to: newUser.email,
      subject: `Verify Your Email - Rerendet Coffee`,
      html: emailHtml
    });



    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for verification.',
      data: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        userType: newUser.userType
      }
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    await User.findByIdAndDelete(newUser._id);
    res.status(500);
    throw new Error('Registration failed: Could not send verification email. Please try again.');
  }
});

// Google Login
// Google Login
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "697141801323-d2uc6n2f7b2kcckpk1kk6he1du30l1kn.apps.googleusercontent.com");

const googleLogin = asyncHandler(async (req, res) => {
  const { credential, accessToken } = req.body;

  if (!credential && !accessToken) {
    res.status(400);
    throw new Error('Google credential or access token is required');
  }

  try {
    let email, firstName, lastName, picture, googleId;

    if (credential) {
      // Flow 1: ID Token (Standard Button)
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID || "697141801323-d2uc6n2f7b2kcckpk1kk6he1du30l1kn.apps.googleusercontent.com"
      });
      const payload = ticket.getPayload();
      email = payload.email;
      firstName = payload.given_name;
      lastName = payload.family_name;
      picture = payload.picture;
      googleId = payload.sub;
    } else {
      // Flow 2: Access Token (Custom Button)
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
      const payload = await response.json();

      if (!payload.email) throw new Error('Invalid Access Token');

      email = payload.email;
      firstName = payload.given_name;
      lastName = payload.family_name;
      picture = payload.picture;
      googleId = payload.sub;
    }

    console.log('✅ Google token verified for email:', email);

    // Check if user exists
    let user = await User.findOne({ email }).populate('cart.product');

    if (user) {
      console.log('👤 Existing user found:', email, 'Type:', user.userType);
      // RELAXED SECURITY: Allow Admin Login via Google for testing flow
      if (user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin') {
        console.log('✅ Allowing Admin login via Google for testing:', email);
        // We continue and grant them a token below
      }

      // If user exists, update googleId if missing
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.profilePicture) user.profilePicture = picture;
        // Auto-verify if trusting Google
        if (!user.isVerified) user.isVerified = true;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        firstName,
        lastName: lastName || firstName, // Handle missing last name
        email,
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!", // Secure random password
        googleId,
        userType: 'customer',
        role: 'customer',
        // Mark as verified since Google vouches for email, but we still force 2FA login
        isVerified: true,
        profilePicture: picture
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // ENFORCE 2FA: Generate Verification Code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      // Fetch store logo for email
      let logoUrl;
      try {
        const settings = await Settings.getSettings();
        logoUrl = settings?.store?.logo;
      } catch (error) {
        console.error('Error fetching settings for email logo:', error);
      }

      // Send detailed 2FA Email
      try {
        await sendEmail({
          to: email,
          subject: 'Google Login Verification - Rerendet Coffee',
          html: getVerificationEmail(firstName, verificationCode, logoUrl)
        });
        console.log('📧 2FA code sent to Google user:', email);
      } catch (err) {
        console.error('❌ Failed to send 2FA email:', err);
        res.status(500);
        throw new Error('Failed to send verification email');
      }

      // Return 2FA Required response (NO TOKEN)
      return res.json({
        success: true,
        message: 'Verification code sent to your email',
        requires2FA: true,
        email: user.email // Needed for frontend context
      });
    }

    // Direct Login (No 2FA)
    user.lastLoginAt = new Date();
    // Ensure verified if they came from Google
    if (!user.isVerified) user.isVerified = true;
    await user.save();

    // Verify device fingerprint asynchronously
    handleDeviceFingerprint(req, user).catch(err => console.error('Device fingerprint error:', err));

    const accessToken = generateAccessToken(user._id, user.tokenVersion || 0);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0);
    setTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    console.log(`✅ Google Login successful for ${email}`);

    res.json({
      success: true,
      message: 'Google login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          role: user.role,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture,
          shippingInfo: user.shippingInfo || {},
          wallet: user.wallet || {},
          cart: user.cart || [],
          twoFactorEnabled: user.twoFactorEnabled
        },
        token: accessToken
      }
    });

  } catch (error) {
    console.error('❌ Google Auth Error Detail:', {
      message: error.message,
      stack: error.stack,
      status: res.statusCode
    });
    // Don't override status if already set (like 403)
    if (res.statusCode === 200) res.status(401);
    throw new Error(error.message || 'Invalid Google Token');
  }
});

// Customer login
const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log('👤 Customer login attempt:', email);

  // First, find user by email to do a proper check
  const user = await User.findOne({ email }).select('+password +isVerified +isActive +loginAttempts +lockUntil +verificationCode +verificationCodeExpires +twoFactorEnabled +userType');

  if (!user) {
    console.log('❌ Customer not found:', email);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check if account is active
  if (user.isActive === false) {
    console.log('❌ Customer account inactive:', email);
    res.status(403);
    throw new Error('Your account has been deactivated. Please contact support.');
  }

  // RELAXED SECURITY: Allow admin to log in via customer portal for testing
  if (user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin') {
    console.log('✅ Allowing admin login via customer portal for testing:', email);
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const lockTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
    res.status(423);
    throw new Error(`Account temporarily locked. Try again in ${lockTime} minutes.`);
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log('❌ Invalid password for customer:', email);

    // Atomically increment login attempts
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { loginAttempts: 1 } },
      { new: true, select: '+loginAttempts' }
    );

    const attempts = updatedUser.loginAttempts;
    const remaining = 5 - attempts;

    // Lock account after 5 failed attempts
    if (attempts >= 5) {
      const lockExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
      await User.findByIdAndUpdate(user._id, {
        $set: { lockUntil: lockExpiry }
      });

      // Send security alert email
      try {
        let logoUrl;
        try {
          const settings = await Settings.getSettings();
          logoUrl = settings?.store?.logo;
        } catch (e) { }
        await sendEmail({
          to: user.email,
          subject: '⚠️ Security Alert: Account Locked - Rerendet Coffee',
          html: getSecurityAlertEmail(
            user.firstName,
            `Your account has been temporarily locked for an hour due to ${attempts} consecutive failed login attempts. If this was not you, please reset your password immediately.`,
            logoUrl
          )
        });
      } catch (emailErr) {
        console.error('Failed to send lock alert email:', emailErr);
      }

      res.status(423);
      throw new Error('Too many failed attempts. Account locked for an hour. A security alert has been sent to your email.');
    }

    res.status(401);
    throw new Error(`Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lock.`);
  }

  // Check for 2FA specifically for the user (ignoring Google auth flow here, this is email/pass)
  if (user.twoFactorEnabled) {
    // Generate code
    const verificationCode = user.generateVerificationCode();
    await user.save({ validateBeforeSave: false }); // Save code to DB

    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    // Send email
    try {
      await sendEmail({
        to: email,
        subject: 'Login Verification Code - Rerendet Coffee',
        html: getVerificationEmail(user.firstName, verificationCode, logoUrl)
      });
    } catch (error) {
      console.error('Failed to send 2FA email:', error);
      res.status(500);
      throw new Error('Failed to send verification email');
    }

    return res.json({
      success: true,
      message: 'Verification code sent to email',
      requires2FA: true,
      email: user.email
    });
  }

  // If no 2FA, proceed with normal login
  // Reset login attempts on successful login
  if (user.loginAttempts > 0 || user.lockUntil) {
    await User.findByIdAndUpdate(user._id, {
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 }
    });
  }

  // Check if account is verified
  if (!user.isVerified) {
    console.log('❌ Customer account not verified:', email);

    // Resend verification code
    const verificationCode = user.generateVerificationCode();
    await user.save({ validateBeforeSave: false });

    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verification Required - Rerendet Coffee',
        html: getVerificationEmail(user.firstName, verificationCode, logoUrl)
      });
    } catch (emailError) {
      console.error('Failed to resend verification:', emailError);
    }

    res.status(403);
    throw new Error('Account not verified. A new verification code has been sent to your email.');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Populate cart after save
  await user.populate('cart.product');

  // Verify device fingerprint asynchronously
  handleDeviceFingerprint(req, user).catch(err => console.error('Device fingerprint error:', err));

  // Generate dual tokens
  const accessToken = generateAccessToken(user._id, user.tokenVersion || 0);
  const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0);
  setTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);

  console.log('✅ Customer login successful:', email);

  // LOG ACTIVITY check removed for customers here.

  res.json({
    success: true,
    message: 'Login successful! Welcome back!',
    data: {
      user: {
        id: user._id,
        _id: user._id, // Add for consistency
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        role: user.role,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        shippingInfo: user.shippingInfo || {},
        wallet: user.wallet || {},
        cart: user.cart || [],
        twoFactorEnabled: user.twoFactorEnabled
      },
      token: accessToken
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    // Validate age if updating dateOfBirth
    if (req.body.dateOfBirth) {
      const age = Math.floor((new Date() - new Date(req.body.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 13) {
        res.status(400);
        throw new Error('You must be at least 13 years old');
      }
    }

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.phone = req.body.phone || user.phone;
    user.gender = req.body.gender || user.gender;
    user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;

    // Handle shipping info update
    if (req.body.shippingInfo) {
      if (!user.shippingInfo) user.shippingInfo = {};

      // Explicitly merge to ensure Mongoose change tracking works
      const newInfo = { ...user.shippingInfo, ...req.body.shippingInfo };
      // Mongoose sometimes struggles with direct assignment of subdocuments if it thinks it's the same object reference
      // So we assign it new object
      user.shippingInfo = newInfo;
      user.markModified('shippingInfo');
    }

    // Handle wallet update
    if (req.body.wallet) {
      if (!user.wallet) user.wallet = {};

      const newWallet = { ...user.wallet, ...req.body.wallet };
      user.wallet = newWallet;
      user.markModified('wallet');
    }

    // Handle newsletter preference if sent
    if (req.body.preferences) {
      user.preferences = { ...user.preferences, ...req.body.preferences };
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        userType: updatedUser.userType,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        profilePicture: updatedUser.profilePicture,
        profilePicture: updatedUser.profilePicture,
        shippingInfo: updatedUser.shippingInfo,
        wallet: updatedUser.wallet,
        twoFactorEnabled: updatedUser.twoFactorEnabled,
        preferences: updatedUser.preferences
      }
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (newPassword && newPassword.length < 8) {
    res.status(400);
    throw new Error('New password must be at least 8 characters long');
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // 1. PASSWORD COOLDOWN: 30 minutes (1800000ms)
  if (user.passwordChangedAt) {
    const timeSinceLastChange = Date.now() - user.passwordChangedAt.getTime();
    const cooldownMs = 30 * 60 * 1000;

    if (timeSinceLastChange < cooldownMs) {
      const remainingMins = Math.ceil((cooldownMs - timeSinceLastChange) / (60 * 1000));
      res.status(429);
      throw new Error(`Security Cooldown: Please wait ${remainingMins} minutes before changing your password again.`);
    }
  }

  if (await bcrypt.compare(currentPassword, user.password)) {
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // 2. SEND SECURITY EMAIL ALERT
    try {
      let logoUrl;
      try {
        const settings = await Settings.getSettings();
        logoUrl = settings?.store?.logo;
      } catch (sErr) {
        console.error('Settings fetch error:', sErr);
      }

      await sendEmail({
        to: user.email,
        subject: 'Security Alert: Password Changed',
        html: getSecurityAlertEmail(user.firstName, 'Password Updated Successfully', logoUrl)
      });
      console.log(`📧 Password change alert sent to: ${user.email}`);
    } catch (emailErr) {
      console.error('❌ Failed to send security alert email:', emailErr);
    }

    // Clear sensitive data from response
    user.password = undefined;

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } else {
    res.status(401);
    throw new Error('Invalid current password');
  }
});

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');

  if (user) {
    const { password } = req.body;

    if (!password) {
      res.status(400);
      throw new Error('Please provide your password to confirm account deletion');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Incorrect password');
    }

    const userEmail = user.email;
    const firstName = user.firstName;

    await User.deleteOne({ _id: user._id });

    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    // Send regret email
    try {
      await sendEmail({
        to: userEmail,
        subject: "Account Deleted - We'll Miss You! ☕",
        html: getRegretEmail(firstName, logoUrl)
      });
      console.log('📧 Regret email sent to:', userEmail);
    } catch (emailError) {
      console.error('❌ Failed to send regret email:', emailError);
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// ==================== ADMIN AUTH ====================

// Admin login (separate endpoint)
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log('👑 Admin login attempt:', email);

  try {
    // Find admin user ONLY
    const user = await User.findOne({
      email,
      userType: 'admin'
    }).select('+password +adminPermissions +role +isVerified +isActive +loginAttempts +lockUntil');

    if (!user) {
      console.log('❌ Admin not found:', email);
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      res.status(423);
      throw new Error(`Account temporarily locked. Try again in ${lockTime} minutes.`);
    }

    // Check if admin account is active
    if (user.isActive === false) {
      console.log('❌ Admin account inactive:', email);
      res.status(401);
      throw new Error('Admin account is deactivated. Please contact system administrator.');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log('❌ Invalid password for admin:', email);

      // Atomically increment login attempts
      const attempts = (user.loginAttempts || 0) + 1;
      await User.findByIdAndUpdate(user._id, {
        $set: { loginAttempts: attempts }
      });

      // Lock after 5 failed attempts — 1 hour
      if (attempts >= 5) {
        await User.findByIdAndUpdate(user._id, {
          $set: { lockUntil: Date.now() + (60 * 60 * 1000) }
        });

        // Send security alert
        try {
          let logoUrl;
          try {
            const settings = await Settings.getSettings();
            logoUrl = settings?.store?.logo;
          } catch (e) { }
          await sendEmail({
            to: user.email,
            subject: '🚨 ADMIN Security Alert: Account Locked - Rerendet',
            html: getSecurityAlertEmail(
              user.firstName,
              `Your admin account has been locked for an hour after ${attempts} failed login attempts. If this was not you, contact the Super Admin immediately.`,
              logoUrl
            )
          });
        } catch (emailErr) {
          console.error('Failed to send admin lock alert:', emailErr);
        }

        res.status(423);
        throw new Error('Too many failed attempts. Admin account locked for an hour. A security alert has been sent.');
      }

      const remaining = 5 - attempts;
      res.status(401);
      throw new Error(`Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      await User.findByIdAndUpdate(user._id, {
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
      });
    }

    // Check if admin account is verified
    if (!user.isVerified) {
      console.log('❌ Admin account not verified:', email);
      res.status(403);
      throw new Error('Admin account requires verification. Please contact system administrator.');
    }



    // Check for 2FA specifically for the admin user
    if (user.twoFactorEnabled) {
      // Generate code
      const verificationCode = user.generateVerificationCode();
      await user.save({ validateBeforeSave: false }); // Save code to DB securely

      // Fetch store logo for email
      let logoUrl;
      try {
        const settings = await Settings.getSettings();
        logoUrl = settings?.store?.logo;
      } catch (error) {
        console.error('Error fetching settings for email logo:', error);
      }

      // Send email
      try {
        await sendEmail({
          to: email,
          subject: 'Admin Login Verification Code - Rerendet',
          html: getVerificationEmail(user.firstName, verificationCode, logoUrl)
        });
        console.log('📧 Admin 2FA code sent to email:', email);
      } catch (error) {
        console.error('Failed to send admin 2FA email:', error);
        res.status(500);
        throw new Error('Failed to send verification email');
      }

      return res.json({
        success: true,
        message: 'Verification code sent to email',
        requires2FA: true,
        email: user.email
      });
    }

    // Direct Login without 2FA
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // LOG ACTIVITY
    await logActivity(req, 'LOGIN', `${user.firstName} (Direct)`, user._id, {
      method: 'DIRECT_PASSWORD',
      ip: req.ip,
      email: user.email
    });

    // Verify device fingerprint asynchronously
    handleDeviceFingerprint(req, user).catch(err => console.error('Device fingerprint error:', err));

    // Generate Token
    const accessToken = generateAccessToken(user._id, user.tokenVersion || 0);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0);
    setTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    console.log('✅ Admin login successful (2FA Disabled):', email);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.adminPermissions,
          profilePicture: user.profilePicture
        },
        token: accessToken
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    // Ensure we don't expose 500 details unless needed
    if (res.statusCode === 200) res.status(500);
    throw new Error(error.message || 'Server error during admin login');
  }
});

// Create admin (protected - super-admin only)
const createAdmin = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role = 'admin', permissions = {} } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  console.log(`⚡ Super-admin ${req.user.email} creating admin:`, email);

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Set default permissions based on role
  const defaultPermissions = {
    canManageUsers: role === 'super-admin',
    canManageProducts: true,
    canManageOrders: true,
    canManageContent: true,
    ...permissions
  };

  // Create admin
  const admin = await User.create({
    firstName,
    lastName,
    email,
    password,
    userType: 'admin',
    role: role,
    isVerified: true,
    isActive: true,
    adminPermissions: defaultPermissions
  });

  console.log('✅ Admin created:', email, 'Role:', role);

  // Send welcome email to new admin
  try {
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #7c2d12); color: white; padding: 30px; text-align: center;">
          <h1>⚡ Rerendet Coffee Admin</h1>
          <p>Administrator Account Activated</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2>Welcome ${firstName}!</h2>
          <p>Your administrator account has been successfully created and activated.</p>
          <div style="background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3>🔧 Admin Permissions</h3>
            <ul>
              ${defaultPermissions.canManageUsers ? '<li>✅ Manage Users</li>' : ''}
              ${defaultPermissions.canManageProducts ? '<li>✅ Manage Products</li>' : ''}
              ${defaultPermissions.canManageOrders ? '<li>✅ Manage Orders</li>' : ''}
              ${defaultPermissions.canManageContent ? '<li>✅ Manage Content</li>' : ''}
            </ul>
            <p><strong>Role:</strong> ${role}</p>
          </div>
          <p>You can now access the admin dashboard.</p>
          <p><strong>Admin Dashboard:</strong> <a href="${process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://rerendet-coffee.com' : 'http://localhost:5173')}/admin/login">Access Admin Panel</a></p>
        </div>
      </div>
    `;

    await sendEmail({
      to: admin.email,
      subject: `🎯 Admin Account Activated - Rerendet Coffee ${role.toUpperCase()}`,
      templateName: 'adminWelcomeEmail',
      data: {
        firstName: firstName,
        permissions: defaultPermissions,
        role: role,
        adminUrl: `${process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://rerendet-coffee.com' : 'http://localhost:5173')}/admin/login`
      }
    });

    console.log('✅ Admin welcome email sent to:', email);
  } catch (emailError) {
    console.error('❌ Failed to send admin welcome email:', emailError);
  }

  res.status(201).json({
    success: true,
    message: `${role} account created successfully`,
    data: {
      id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.adminPermissions
    }
  });
});

// ==================== COMMON AUTH ====================

// Verify email
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({
    email,
    verificationCode: code,
    verificationCodeExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  // Send welcome email
  try {
    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    await sendEmail({
      to: user.email,
      subject: 'Welcome to Rerendet Coffee! 🎉',
      html: getWelcomeEmail(user.firstName, logoUrl)
    });
  } catch (welcomeError) {
    // Email failure doesn't stop flow
    console.error('Failed to send welcome email:', welcomeError);
  }

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      role: user.role,
      isVerified: user.isVerified,
      cart: user.cart || [],
      token: accessToken
    }
  });
});

// Get current user profile
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('cart.product');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const userData = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    userType: user.userType,
    role: user.role,
    isVerified: user.isVerified,
    profilePicture: user.profilePicture,
    shippingInfo: user.shippingInfo || {}
  };

  const isAdmin = user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin';

  if (isAdmin) {
    userData.permissions = user.adminPermissions;
  }

  res.json({
    success: true,
    data: userData
  });
});

// Update user profile


// Logout — clears HttpOnly refresh token cookie
const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  clearRefreshTokenCookie(res);
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Silent token refresh — reads HttpOnly cookie, issues new access token
// @route   POST /api/auth/refresh
// @access  Public (uses HttpOnly cookie)
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { verifyRefreshToken } = await import('../utils/generateToken.js');
  const cookieToken = req.cookies?.refreshToken;

  if (!cookieToken) {
    res.status(401);
    throw new Error('No refresh token — please log in again.');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(cookieToken);
  } catch (err) {
    clearRefreshTokenCookie(res);
    res.status(401);
    throw new Error('Refresh token invalid or expired — please log in again.');
  }

  const user = await User.findById(decoded.id).select('_id isActive');
  if (!user || user.isActive === false) {
    clearRefreshTokenCookie(res);
    res.status(401);
    throw new Error('Account not found or deactivated.');
  }

  // Issue fresh access token + rotate refresh token
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  setRefreshTokenCookie(res, newRefreshToken);

  res.json({
    success: true,
    data: { token: newAccessToken }
  });
});

// Check email availability
const checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    res.status(400);
    throw new Error('Email parameter is required');
  }

  const user = await User.findOne({ email });

  res.json({
    success: true,
    data: {
      exists: !!user,
      userType: user?.userType
    }
  });
});

// Forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ email });

  // Anti-Enumeration: Always return success even if user is not found
  if (!user) {
    console.log(`🔒 [Anti-Enumeration] Forgot password requested for non-existent email: ${email}`);
    return res.json({
      success: true,
      message: 'If an account exists with that email, a reset code has been sent.'
    });
  }

  // Generate 6-char clean secure token (3 bytes hex, e.g. "a2c3f4")
  const rawToken = crypto.randomBytes(3).toString('hex').toLowerCase();
  
  // Store SHA-256 hashed token in DB
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // Strict 15 minutes expiration
  await user.save({ validateBeforeSave: false });

  try {
    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    // Send reset email with rawToken
    const emailHtml = getResetPasswordEmail(user.firstName, rawToken, logoUrl);

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: emailHtml
    });
    console.log(`📧 Hashed reset email sent to: ${user.email} | Raw Token: ${rawToken}`);

    res.json({
      success: true,
      message: 'If an account exists with that email, a reset code has been sent.'
    });

  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// Reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    res.status(400);
    throw new Error('Email, code, and new password are required');
  }

  // Validate new password strength using zxcvbn / high entropy validator
  const strength = checkPasswordStrength(newPassword, email);
  if (strength.score < 3) {
    res.status(400);
    throw new Error(`Password too weak! ${strength.feedback} (Strength Score: ${strength.score}/4)`);
  }

  // Hash received code for matching
  const hashedCode = crypto.createHash('sha256').update(String(code).toLowerCase().trim()).digest('hex');

  const user = await User.findOne({
    email,
    resetPasswordToken: hashedCode,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset code');
  }

  // PASSWORD COOLDOWN: 30 minutes
  if (user.passwordChangedAt) {
    const timeSinceLastChange = Date.now() - user.passwordChangedAt.getTime();
    if (timeSinceLastChange < 30 * 60 * 1000) {
      res.status(429);
      throw new Error('Security Cooldown: A password change was recently processed. Please wait before resetting again.');
    }
  }

  user.password = newPassword;
  user.passwordChangedAt = Date.now();
  user.resetPasswordToken = undefined; // Single-use: Delete immediately
  user.resetPasswordExpires = undefined;
  
  // Clear any active account lock — password reset is the self-service unlock path
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  // Global Logout: Increment tokenVersion to invalidate all older JWT sessions instantly
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  // SEND ALERT
  try {
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (e) { }

    await sendEmail({
      to: user.email,
      subject: 'Security Alert: Password Reset',
      html: getSecurityAlertEmail(user.firstName, 'Password Reset via Recovery Code. All other devices have been logged out.', logoUrl)
    });
  } catch (err) { }

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});

// Change password


// Resend verification code
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ email, userType: 'customer' });

  if (!user) {
    res.status(404);
    throw new Error('User not found with this email');
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error('Email is already verified');
  }

  const verificationCode = user.generateVerificationCode();
  await user.save({ validateBeforeSave: false });

  try {
    const emailHtml = `
  < div style = "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;" >
        <div style="background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center;">
          <h1>☕ Rerendet Coffee</h1>
          <p>New Verification Code</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2>Hello ${user.firstName}!</h2>
          <p>You requested a new verification code:</p>
          <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border: 2px dashed #10b981;">
            <div style="font-size: 2.5rem; font-weight: bold; color: #10b981; letter-spacing: 5px;">${verificationCode}</div>
          </div>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0;">
            <strong>⚠️ This code will expire in 10 minutes.</strong>
          </div>
        </div>
      </div >
  `;

    await sendEmail({
      to: user.email,
      subject: 'New Verification Code - Rerendet Coffee',
      templateName: 'verificationEmail',
      data: {
        firstName: user.firstName,
        verificationCode: verificationCode
      }
    });

    console.log('✅ Verification email resent to:', email);

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    res.status(500);
    throw new Error('Failed to send verification email');
  }
});



/**
 * @desc    Get user's saved cart
 * @route   GET /api/auth/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('cart.product');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    data: user.cart || []
  });
});

/**
 * @desc    Sync user's cart with database
 * @route   POST /api/auth/cart
 * @access  Private
 */
const syncCart = asyncHandler(async (req, res) => {
  const { cart } = req.body;

  if (!Array.isArray(cart)) {
    res.status(400);
    throw new Error('Invalid cart data');
  }

  // Map frontend cart to database structure
  const formattedCart = cart.map(item => ({
    product: item.productId || item._id,
    quantity: item.quantity,
    size: item.size || '250g'
  }));

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { cart: formattedCart },
    { new: true, runValidators: true }
  ).populate('cart.product');

  res.status(200).json({
    success: true,
    data: user.cart
  });
});

/**
 * @desc    Get current user's activity logs
 * @route   GET /api/auth/activity
 * @access  Private
 */
const getMyLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find({ admin: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    success: true,
    data: logs
  });
});

// @desc    Verify current password
// @route   POST /api/auth/verify-password
// @access  Private
const verifyPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    res.status(400);
    throw new Error('Password is required');
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Incorrect password');
  }

  res.json({
    success: true,
    message: 'Password verified'
  });
});

// @desc    Admin manually unlock a user account
// @route   PUT /api/auth/admin/unlock/:userId
// @access  Admin
const unlockUserAccount = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('+loginAttempts +lockUntil');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await User.findByIdAndUpdate(userId, {
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });

  // Log the admin action
  await logActivity(req, 'UPDATE', `Unlocked account for ${user.firstName} ${user.lastName} (${user.email})`, userId, {
    action: 'MANUAL_ACCOUNT_UNLOCK',
    performedBy: req.user._id
  });

  // Notify user their account was unlocked
  try {
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (e) { }
    await sendEmail({
      to: user.email,
      subject: '✅ Account Unlocked - Rerendet Coffee',
      html: getSecurityAlertEmail(
        user.firstName,
        'Your account has been manually unlocked by our support team. You can now log in. If you did not request this, please contact us immediately.',
        logoUrl
      )
    });
  } catch (emailErr) {
    console.error('Failed to send unlock notification:', emailErr);
  }

  res.json({
    success: true,
    message: `Account for ${user.email} has been unlocked successfully`
  });
});

export {
  // Customer auth
  registerCustomer,
  loginCustomer,
  verify2FALogin,
  toggle2FA,
  googleLogin,

  // Admin auth
  loginAdmin,
  createAdmin,

  // Common auth
  verifyEmail,
  getCurrentUser,
  updateProfile,
  logout,
  checkEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  changePassword,
  deleteAccount,

  // Additional methods
  getCart,
  syncCart,
  getMyLogs,
  verifyPassword,
  unlockUserAccount,
  refreshAccessToken
};