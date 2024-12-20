import { Document, Schema, model } from 'mongoose'; // v7.5.0
import { AUTH_CONFIG } from '../config/auth.config';

/**
 * Enum defining user roles for role-based access control
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  TEAM_LEAD = 'TEAM_LEAD',
  CONTRIBUTOR = 'CONTRIBUTOR',
  READER = 'READER'
}

/**
 * Enum defining supported OAuth providers
 */
export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
  MICROSOFT = 'MICROSOFT'
}

/**
 * Interface defining the user document structure
 */
export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  isMFAEnabled: boolean;
  mfaSecret: string;
  oauthProviders: OAuthProvider[];
  loginAttempts: number;
  lockoutUntil: Date;
  lastLogin: Date;
  lastPasswordChange: Date;
  createdAt: Date;
  updatedAt: Date;
  validatePassword(password: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

/**
 * Mongoose schema for the user model with comprehensive security features
 */
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: AUTH_CONFIG.security.passwordMinLength,
    maxlength: AUTH_CONFIG.security.passwordMaxLength,
    select: false // Exclude password from query results by default
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true,
    default: UserRole.READER
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  isMFAEnabled: {
    type: Boolean,
    default: false,
    required: true
  },
  mfaSecret: {
    type: String,
    select: false // Exclude MFA secret from query results by default
  },
  oauthProviders: [{
    type: String,
    enum: Object.values(OAuthProvider)
  }],
  loginAttempts: {
    type: Number,
    required: true,
    default: 0
  },
  lockoutUntil: {
    type: Date,
    default: null,
    index: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'users',
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.mfaSecret;
      return ret;
    }
  }
});

/**
 * Password validation with comprehensive security requirements
 */
UserSchema.methods.validatePassword = async function(password: string): Promise<boolean> {
  if (!password) return false;
  
  // Check length requirements
  if (password.length < AUTH_CONFIG.security.passwordMinLength ||
      password.length > AUTH_CONFIG.security.passwordMaxLength) {
    return false;
  }

  // Check complexity requirements
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars;
};

/**
 * Increment login attempts and implement account lockout
 */
UserSchema.methods.incrementLoginAttempts = async function(): Promise<void> {
  // Reset lockout if it's expired
  if (this.lockoutUntil && this.lockoutUntil < new Date()) {
    this.loginAttempts = 1;
    this.lockoutUntil = null;
  } else {
    // Increment login attempts
    this.loginAttempts += 1;

    // Lock the account if max attempts exceeded
    if (this.loginAttempts >= AUTH_CONFIG.security.maxLoginAttempts) {
      const lockoutDuration = AUTH_CONFIG.security.lockoutDuration * 1000; // Convert to milliseconds
      this.lockoutUntil = new Date(Date.now() + lockoutDuration);
    }
  }

  await this.save();
};

/**
 * Reset login attempts after successful authentication
 */
UserSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  this.loginAttempts = 0;
  this.lockoutUntil = null;
  this.lastLogin = new Date();
  await this.save();
};

// Indexes for performance optimization
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ loginAttempts: 1, lockoutUntil: 1 });

// Create and export the User model
const UserModel = model<IUser>('User', UserSchema);
export default UserModel;