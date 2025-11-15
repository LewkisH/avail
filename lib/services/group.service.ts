import { prisma } from '../prisma';

export class GroupService {
    /**
     * Create a new group
     * @param ownerId - User ID of the group owner
     * @param name - Group name
     * @returns Created group with owner as first member
     */
    static async createGroup(ownerId: string, name: string) {
        return await prisma.$transaction(async (tx) => {
            // Create the group
            const group = await tx.group.create({
                data: {
                    name,
                    ownerId,
                },
            });

            // Add owner as first member
            await tx.groupMember.create({
                data: {
                    groupId: group.id,
                    userId: ownerId,
                },
            });

            // Return group with members
            return await tx.group.findUnique({
                where: { id: group.id },
                include: {
                    owner: true,
                    members: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
        });
    }

    /**
     * Invite a user to a group by email
     * Creates an invitation with a unique token that expires in 7 days
     * @param groupId - Group ID
     * @param email - Email of user to invite
     * @param invitedBy - User ID of person sending invitation
     * @returns Created invitation
     */
    static async inviteToGroup(
        groupId: string,
        email: string,
        invitedBy: string
    ) {
        // Check if user with this email is already a member
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            const existingMember = await prisma.groupMember.findUnique({
                where: {
                    groupId_userId: {
                        groupId,
                        userId: existingUser.id,
                    },
                },
            });

            if (existingMember) {
                throw new Error('User is already a member of this group');
            }
        }

        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return await prisma.groupInvitation.create({
            data: {
                groupId,
                invitedEmail: email,
                invitedBy,
                expiresAt,
            },
            include: {
                group: true,
                inviter: true,
            },
        });
    }

    /**
     * Decline a group invitation
     * Updates invitation status to declined
     * @param token - Invitation token
     * @param userId - User ID declining the invitation
     * @returns Updated invitation
     */
    static async declineInvitation(token: string, userId: string) {
        return await prisma.$transaction(async (tx) => {
            // Find the invitation
            const invitation = await tx.groupInvitation.findUnique({
                where: { token },
            });

            if (!invitation) {
                throw new Error('Invitation not found');
            }

            if (invitation.status !== 'pending') {
                throw new Error('Invitation has already been processed');
            }

            // Get user to verify email matches
            const user = await tx.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new Error('User not found');
            }

            if (user.email !== invitation.invitedEmail) {
                throw new Error('Email does not match invitation');
            }

            // Update invitation status to declined
            return await tx.groupInvitation.update({
                where: { id: invitation.id },
                data: { status: 'declined' },
                include: {
                    group: true,
                },
            });
        });
    }

    /**
     * Accept a group invitation
     * Validates token, checks expiration, and adds user to group
     * @param token - Invitation token
     * @param userId - User ID accepting the invitation
     * @returns Updated invitation and group membership
     */
    static async acceptInvitation(token: string, userId: string) {
        return await prisma.$transaction(async (tx) => {
            // Find the invitation
            const invitation = await tx.groupInvitation.findUnique({
                where: { token },
                include: {
                    group: true,
                },
            });

            if (!invitation) {
                throw new Error('Invitation not found');
            }

            if (invitation.status !== 'pending') {
                throw new Error('Invitation has already been processed');
            }

            if (invitation.expiresAt < new Date()) {
                throw new Error('Invitation has expired');
            }

            // Get user to verify email matches
            const user = await tx.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new Error('User not found');
            }

            if (user.email !== invitation.invitedEmail) {
                throw new Error('Email does not match invitation');
            }

            // Check if user is already a member
            const existingMember = await tx.groupMember.findUnique({
                where: {
                    groupId_userId: {
                        groupId: invitation.groupId,
                        userId,
                    },
                },
            });

            if (existingMember) {
                throw new Error('User is already a member of this group');
            }

            // Update invitation status
            await tx.groupInvitation.update({
                where: { id: invitation.id },
                data: { status: 'accepted' },
            });

            // Add user to group
            const membership = await tx.groupMember.create({
                data: {
                    groupId: invitation.groupId,
                    userId,
                },
                include: {
                    group: true,
                    user: true,
                },
            });

            return membership;
        });
    }

    /**
     * Get all members of a group
     * @param groupId - Group ID
     * @returns Array of group members with user details
     */
    static async getGroupMembers(groupId: string) {
        return await prisma.groupMember.findMany({
            where: { groupId },
            include: {
                user: {
                    include: {
                        interests: true,
                        budget: true,
                    },
                },
            },
            orderBy: {
                joinedAt: 'asc',
            },
        });
    }

    /**
     * Remove a user from a group
     * Owner cannot leave their own group (must transfer ownership or delete group)
     * @param groupId - Group ID
     * @param userId - User ID to remove
     * @returns Deleted membership record
     */
    static async leaveGroup(groupId: string, userId: string) {
        return await prisma.$transaction(async (tx) => {
            // Check if user is the owner
            const group = await tx.group.findUnique({
                where: { id: groupId },
            });

            if (!group) {
                throw new Error('Group not found');
            }

            if (group.ownerId === userId) {
                throw new Error(
                    'Group owner cannot leave the group. Transfer ownership or delete the group.'
                );
            }

            // Remove user from group
            const membership = await tx.groupMember.delete({
                where: {
                    groupId_userId: {
                        groupId,
                        userId,
                    },
                },
            });

            return membership;
        });
    }

    /**
     * Get all groups a user belongs to
     * @param userId - User ID
     * @returns Array of groups with member details
     */
    static async getUserGroups(userId: string) {
        const memberships = await prisma.groupMember.findMany({
            where: { userId },
            include: {
                group: {
                    include: {
                        owner: true,
                        members: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                joinedAt: 'desc',
            },
        });

        return memberships.map((membership) => membership.group);
    }

    /**
     * Get all groups owned by a user
     * @param userId - User ID
     * @returns Array of groups owned by the user
     */
    static async getUserOwnedGroups(userId: string) {
        return await prisma.group.findMany({
            where: { ownerId: userId },
            include: {
                owner: true,
                members: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}
