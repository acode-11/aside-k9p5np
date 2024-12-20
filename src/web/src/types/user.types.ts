/**
 * @fileoverview TypeScript type definitions and interfaces for user-related data structures,
 * implementing role-based access control and platform-specific permissions.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { z } from 'zod'; // v3.22.4
import { PlatformType } from './platform.types';

/**
 * Hierarchical user roles in the system with increasing levels of access
 */
export enum UserRole {
  READER = 'READER',                     // Read-only access
  CONTRIBUTOR = 'CONTRIBUTOR',           // Can create and edit content
  TEAM_LEAD = 'TEAM_LEAD',              // Team management and private libraries
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN', // Organization-wide management
  ADMIN = 'ADMIN'                        // Full system access
}

/**
 * UI theme options for user preferences
 */
export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM'
}

/**
 * User notification preference levels
 */
export enum NotificationSettings {
  ALL = 'ALL',           // Receive all notifications
  IMPORTANT = 'IMPORTANT', // Only important notifications
  NONE = 'NONE'         // No notifications
}

/**
 * Platform-specific permissions interface for granular access control
 */
export interface IUserPlatformPermissions {
  canView: boolean;    // Can view platform-specific content
  canModify: boolean;  // Can modify platform-specific content
  canDeploy: boolean;  // Can deploy to platform
}

/**
 * User preferences interface for customization settings
 */
export interface IUserPreferences {
  theme: Theme;
  notifications: NotificationSettings;
  defaultPlatform: PlatformType;
}

/**
 * Session management interface for authenticated users
 */
export interface IUserSession {
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Comprehensive user interface containing all user-related data
 */
export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  teamIds: string[];
  platformPermissions: Record<PlatformType, IUserPlatformPermissions>;
  preferences: IUserPreferences;
  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * Default user preferences configuration
 */
export const DEFAULT_USER_PREFERENCES: IUserPreferences = {
  theme: Theme.SYSTEM,
  notifications: NotificationSettings.IMPORTANT,
  defaultPlatform: PlatformType.SIEM
};

/**
 * Zod schema for runtime user data validation
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  organizationId: z.string().uuid(),
  teamIds: z.array(z.string().uuid()),
  platformPermissions: z.record(z.nativeEnum(PlatformType), z.object({
    canView: z.boolean(),
    canModify: z.boolean(),
    canDeploy: z.boolean()
  })),
  preferences: z.object({
    theme: z.nativeEnum(Theme),
    notifications: z.nativeEnum(NotificationSettings),
    defaultPlatform: z.nativeEnum(PlatformType)
  }),
  createdAt: z.date(),
  lastLoginAt: z.date()
});

/**
 * Type guard to check if a value is a valid UserRole
 */
export const isUserRole = (value: unknown): value is UserRole => {
  return Object.values(UserRole).includes(value as UserRole);
};

/**
 * Helper function to check if a user has a specific platform permission
 */
export const hasPermission = (
  user: IUser,
  platform: PlatformType,
  permission: keyof IUserPlatformPermissions
): boolean => {
  return user.platformPermissions[platform]?.[permission] ?? false;
};

/**
 * Helper function to check if a user has admin privileges
 */
export const isAdmin = (user: IUser): boolean => {
  return user.role === UserRole.ADMIN;
};

/**
 * Helper function to check if a user has organization admin privileges
 */
export const isOrganizationAdmin = (user: IUser): boolean => {
  return user.role === UserRole.ORGANIZATION_ADMIN || isAdmin(user);
};

/**
 * Helper function to check if a user is a team lead
 */
export const isTeamLead = (user: IUser): boolean => {
  return user.role === UserRole.TEAM_LEAD || isOrganizationAdmin(user);
};