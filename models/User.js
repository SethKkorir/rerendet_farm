import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';

const userSchema = new mongoose.Schema({
  // Basic info
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    get: decrypt,
    set: encrypt
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },

  // User type and roles
  userType: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  storeCredit: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'super-admin'],
    default: 'customer'
  },

  // Admin specific fields
  adminPermissions: {
    canManageUsers: { type: Boolean, default: false },
    canManageProducts: { type: Boolean, default: false },
    canManageOrders: { type: Boolean, default: false },
    canManageContent: { type: Boolean, default: false }
  },

  // Account status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Security fields
  verificationCode: { type: String, select: false },
  verificationCodeExpires: { type: Date, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
  passwordChangedAt: Date,
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  twoFactorBackupCodes: { type: [String], select: false },
  twoFactorCode: { type: String, select: false },
  twoFactorCodeExpires: { type: Date, select: false },

  // Profile
  profilePicture: String,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },

  // Shipping info
  shippingInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    county: String,
    town: String,
    zip: String,
    country: String,
    deliveryOption: String
  },

  // Wallet / Payment Methods
  wallet: {
    mpesaPhone: {
      type: String,
      trim: true,
      get: decrypt,
      set: encrypt
    },
    card: {
      holderName: String,
      numberMasked: String, // e.g. **** **** **** 4242
      expiryDate: String,
      brand: String // visa, mastercard, etc.
    }
  },

  // Audit and security
  lastLoginAt: Date,
  lastActivityAt: Date,
  tokenVersion: { type: Number, default: 0 },
  knownDevices: [
    {
      ip: String,
      userAgent: String,
      location: String,
      verifiedAt: { type: Date, default: Date.now }
    }
  ],

  // Shopping Cart Persistence
  cart: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: {
        type: Number,
        default: 1
      },
      size: {
        type: String,
        default: '250g'
      }
    }
  ]
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Virtuals
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(14);
    this.password = await bcrypt.hash(this.password, salt);

    if (this.isModified('password') && !this.isNew) {
      this.passwordChangedAt = Date.now();
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCode = code;
  this.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return code;
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.verificationCode;
  delete user.verificationCodeExpires;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

const User = mongoose.model('User', userSchema, 'users');

export default User;