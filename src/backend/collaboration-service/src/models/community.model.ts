import { Document, Schema, model } from 'mongoose'; // v7.5.0
import { IUser, UserRole } from '../../auth-service/src/models/user.model';

/**
 * Enum defining community types with enhanced categorization
 */
export enum CommunityType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  ENTERPRISE = 'ENTERPRISE',
  RESEARCH = 'RESEARCH'
}

/**
 * Enum defining community visibility levels
 */
export enum CommunityVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  ORGANIZATION = 'ORGANIZATION',
  INVITE_ONLY = 'INVITE_ONLY'
}

/**
 * Enum defining member roles within a community
 */
export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  OBSERVER = 'OBSERVER'
}

/**
 * Interface defining member permissions
 */
export enum MemberPermissions {
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  MANAGE_CONTENT = 'MANAGE_CONTENT',
  CREATE_DISCUSSIONS = 'CREATE_DISCUSSIONS',
  MODERATE_DISCUSSIONS = 'MODERATE_DISCUSSIONS',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS'
}

/**
 * Interface for member activity tracking
 */
export interface IMemberActivity {
  discussionsCreated: number;
  commentsPosted: number;
  detectionsShared: number;
  lastContributionAt: Date;
  reputationHistory: Array<{
    points: number;
    reason: string;
    timestamp: Date;
  }>;
}

/**
 * Interface for community member
 */
export interface IMember {
  userId: string;
  role: MemberRole;
  permissions: MemberPermissions[];
  reputationScore: number;
  activity: IMemberActivity;
  joinedAt: Date;
  lastActiveAt: Date;
}

/**
 * Interface for community analytics
 */
export interface IAnalytics {
  memberCount: number;
  activeMembers: number;
  discussionCount: number;
  detectionCount: number;
  totalViews: number;
  engagementRate: number;
  topContributors: Array<{
    userId: string;
    contributions: number;
    reputationScore: number;
  }>;
  activityTimeline: Array<{
    date: Date;
    discussions: number;
    detections: number;
    comments: number;
  }>;
}

/**
 * Interface for community settings
 */
export interface ICommunitySettings {
  allowMemberInvites: boolean;
  requireMemberApproval: boolean;
  enableDiscussions: boolean;
  enableDetectionSharing: boolean;
  enableReputationSystem: boolean;
  minimumReputationToPost: number;
  contentModeration: {
    requireApproval: boolean;
    autoModeration: boolean;
    moderatorRoles: MemberRole[];
  };
  notificationSettings: {
    enableEmailNotifications: boolean;
    enableInAppNotifications: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

/**
 * Interface for community document
 */
export interface ICommunity extends Document {
  name: string;
  description: string;
  slug: string;
  type: CommunityType;
  visibility: CommunityVisibility;
  owner: IUser['id'];
  members: IMember[];
  settings: ICommunitySettings;
  analytics: IAnalytics;
  organizationId: string;
  tags: string[];
  isVerified: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  addMember(user: IUser, role: MemberRole, permissions: MemberPermissions[]): Promise<ICommunity>;
  removeMember(userId: string): Promise<ICommunity>;
  updateAnalytics(): Promise<void>;
}

/**
 * Mongoose schema for community with comprehensive features
 */
const CommunitySchema = new Schema<ICommunity>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(CommunityType),
    required: true,
    index: true
  },
  visibility: {
    type: String,
    enum: Object.values(CommunityVisibility),
    required: true,
    index: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: Object.values(MemberRole), required: true },
    permissions: [{ type: String, enum: Object.values(MemberPermissions) }],
    reputationScore: { type: Number, default: 0 },
    activity: {
      discussionsCreated: { type: Number, default: 0 },
      commentsPosted: { type: Number, default: 0 },
      detectionsShared: { type: Number, default: 0 },
      lastContributionAt: Date,
      reputationHistory: [{
        points: Number,
        reason: String,
        timestamp: { type: Date, default: Date.now }
      }]
    },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now }
  }],
  settings: {
    type: Object,
    required: true,
    default: {
      allowMemberInvites: true,
      requireMemberApproval: false,
      enableDiscussions: true,
      enableDetectionSharing: true,
      enableReputationSystem: true,
      minimumReputationToPost: 0,
      contentModeration: {
        requireApproval: false,
        autoModeration: true,
        moderatorRoles: [MemberRole.MODERATOR, MemberRole.ADMIN]
      },
      notificationSettings: {
        enableEmailNotifications: true,
        enableInAppNotifications: true,
        digestFrequency: 'weekly'
      }
    }
  },
  analytics: {
    type: Object,
    required: true,
    default: {
      memberCount: 0,
      activeMembers: 0,
      discussionCount: 0,
      detectionCount: 0,
      totalViews: 0,
      engagementRate: 0,
      topContributors: [],
      activityTimeline: []
    }
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'communities'
});

// Indexes for performance optimization
CommunitySchema.index({ name: 'text', description: 'text' });
CommunitySchema.index({ 'members.userId': 1 });
CommunitySchema.index({ 'members.role': 1 });
CommunitySchema.index({ createdAt: -1 });
CommunitySchema.index({ lastActivityAt: -1 });

/**
 * Add member to community with validation
 */
CommunitySchema.methods.addMember = async function(
  user: IUser,
  role: MemberRole,
  permissions: MemberPermissions[]
): Promise<ICommunity> {
  // Check if user is already a member
  if (this.members.some(member => member.userId.toString() === user.id)) {
    throw new Error('User is already a member of this community');
  }

  // Validate organization membership for enterprise communities
  if (this.type === CommunityType.ENTERPRISE && 
      this.organizationId !== user.organizationId) {
    throw new Error('User must belong to the organization to join this community');
  }

  // Create new member object
  const newMember: IMember = {
    userId: user.id,
    role,
    permissions,
    reputationScore: 0,
    activity: {
      discussionsCreated: 0,
      commentsPosted: 0,
      detectionsShared: 0,
      lastContributionAt: new Date(),
      reputationHistory: []
    },
    joinedAt: new Date(),
    lastActiveAt: new Date()
  };

  this.members.push(newMember);
  this.lastActivityAt = new Date();
  await this.updateAnalytics();
  
  return this.save();
};

/**
 * Remove member from community with cleanup
 */
CommunitySchema.methods.removeMember = async function(userId: string): Promise<ICommunity> {
  const memberIndex = this.members.findIndex(member => member.userId.toString() === userId);
  
  if (memberIndex === -1) {
    throw new Error('User is not a member of this community');
  }

  // Prevent removal of the owner
  if (this.owner.toString() === userId) {
    throw new Error('Cannot remove the community owner');
  }

  this.members.splice(memberIndex, 1);
  this.lastActivityAt = new Date();
  await this.updateAnalytics();
  
  return this.save();
};

/**
 * Update community analytics
 */
CommunitySchema.methods.updateAnalytics = async function(): Promise<void> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

  this.analytics.memberCount = this.members.length;
  this.analytics.activeMembers = this.members.filter(
    member => member.lastActiveAt > thirtyDaysAgo
  ).length;

  // Update top contributors
  this.analytics.topContributors = this.members
    .sort((a, b) => b.reputationScore - a.reputationScore)
    .slice(0, 10)
    .map(member => ({
      userId: member.userId,
      contributions: member.activity.discussionsCreated + 
                    member.activity.commentsPosted + 
                    member.activity.detectionsShared,
      reputationScore: member.reputationScore
    }));
};

// Create and export the Community model
const CommunityModel = model<ICommunity>('Community', CommunitySchema);
export default CommunityModel;