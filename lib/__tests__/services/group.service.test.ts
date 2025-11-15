import { GroupService } from '../../services/group.service';
import { prismaMock } from '../setup/prisma-mock';

describe('GroupService', () => {
  describe('createGroup', () => {
    it('should create a group and add owner as member', async () => {
      const mockGroup = {
        id: 'group_1',
        name: 'Test Group',
        ownerId: 'user_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockGroupWithDetails = {
        ...mockGroup,
        owner: {
          id: 'user_1',
          email: 'owner@example.com',
          name: 'Owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        members: [
          {
            id: 'member_1',
            groupId: 'group_1',
            userId: 'user_1',
            joinedAt: new Date(),
            user: {
              id: 'user_1',
              email: 'owner@example.com',
              name: 'Owner',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      prismaMock.group.create.mockResolvedValue(mockGroup);
      prismaMock.groupMember.create.mockResolvedValue({
        id: 'member_1',
        groupId: 'group_1',
        userId: 'user_1',
        joinedAt: new Date(),
      });
      prismaMock.group.findUnique.mockResolvedValue(mockGroupWithDetails);

      const result = await GroupService.createGroup('user_1', 'Test Group');

      expect(result).toEqual(mockGroupWithDetails);
      expect(prismaMock.group.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Group',
          ownerId: 'user_1',
        },
      });
    });
  });

  describe('inviteToGroup', () => {
    it('should create an invitation with 7-day expiration', async () => {
      const mockInvitation = {
        id: 'inv_1',
        groupId: 'group_1',
        invitedEmail: 'invitee@example.com',
        invitedBy: 'user_1',
        status: 'pending' as const,
        token: 'token_123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        group: {
          id: 'group_1',
          name: 'Test Group',
          ownerId: 'user_1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        inviter: {
          id: 'user_1',
          email: 'inviter@example.com',
          name: 'Inviter',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      prismaMock.groupInvitation.create.mockResolvedValue(mockInvitation);

      const result = await GroupService.inviteToGroup(
        'group_1',
        'invitee@example.com',
        'user_1'
      );

      expect(result).toEqual(mockInvitation);
      expect(prismaMock.groupInvitation.create).toHaveBeenCalled();
    });
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation and add user to group', async () => {
      const mockInvitation = {
        id: 'inv_1',
        groupId: 'group_1',
        invitedEmail: 'user@example.com',
        invitedBy: 'user_1',
        status: 'pending' as const,
        token: 'token_123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        group: {
          id: 'group_1',
          name: 'Test Group',
          ownerId: 'user_1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockUser = {
        id: 'user_2',
        email: 'user@example.com',
        name: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMembership = {
        id: 'member_1',
        groupId: 'group_1',
        userId: 'user_2',
        joinedAt: new Date(),
        group: mockInvitation.group,
        user: mockUser,
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      prismaMock.groupInvitation.findUnique.mockResolvedValue(mockInvitation);
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.groupMember.findUnique.mockResolvedValue(null);
      prismaMock.groupInvitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'accepted',
      });
      prismaMock.groupMember.create.mockResolvedValue(mockMembership);

      const result = await GroupService.acceptInvitation('token_123', 'user_2');

      expect(result).toEqual(mockMembership);
    });

    it('should throw error if invitation not found', async () => {
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      prismaMock.groupInvitation.findUnique.mockResolvedValue(null);

      await expect(
        GroupService.acceptInvitation('invalid_token', 'user_2')
      ).rejects.toThrow('Invitation not found');
    });

    it('should throw error if invitation expired', async () => {
      const expiredInvitation = {
        id: 'inv_1',
        groupId: 'group_1',
        invitedEmail: 'user@example.com',
        invitedBy: 'user_1',
        status: 'pending' as const,
        token: 'token_123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
        group: {
          id: 'group_1',
          name: 'Test Group',
          ownerId: 'user_1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      prismaMock.groupInvitation.findUnique.mockResolvedValue(
        expiredInvitation
      );

      await expect(
        GroupService.acceptInvitation('token_123', 'user_2')
      ).rejects.toThrow('Invitation has expired');
    });
  });

  describe('getGroupMembers', () => {
    it('should return all group members with user details', async () => {
      const mockMembers = [
        {
          id: 'member_1',
          groupId: 'group_1',
          userId: 'user_1',
          joinedAt: new Date(),
          user: {
            id: 'user_1',
            email: 'user1@example.com',
            name: 'User 1',
            createdAt: new Date(),
            updatedAt: new Date(),
            interests: [],
            budget: null,
          },
        },
      ];

      prismaMock.groupMember.findMany.mockResolvedValue(mockMembers);

      const result = await GroupService.getGroupMembers('group_1');

      expect(result).toEqual(mockMembers);
      expect(prismaMock.groupMember.findMany).toHaveBeenCalledWith({
        where: { groupId: 'group_1' },
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
    });
  });

  describe('leaveGroup', () => {
    it('should remove user from group', async () => {
      const mockGroup = {
        id: 'group_1',
        name: 'Test Group',
        ownerId: 'user_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMembership = {
        id: 'member_1',
        groupId: 'group_1',
        userId: 'user_2',
        joinedAt: new Date(),
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      prismaMock.group.findUnique.mockResolvedValue(mockGroup);
      prismaMock.groupMember.delete.mockResolvedValue(mockMembership);

      const result = await GroupService.leaveGroup('group_1', 'user_2');

      expect(result).toEqual(mockMembership);
    });

    it('should throw error if owner tries to leave', async () => {
      const mockGroup = {
        id: 'group_1',
        name: 'Test Group',
        ownerId: 'user_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });

      prismaMock.group.findUnique.mockResolvedValue(mockGroup);

      await expect(
        GroupService.leaveGroup('group_1', 'user_1')
      ).rejects.toThrow('Group owner cannot leave the group');
    });
  });

  describe('getUserGroups', () => {
    it('should return all groups user belongs to', async () => {
      const mockMemberships = [
        {
          id: 'member_1',
          groupId: 'group_1',
          userId: 'user_1',
          joinedAt: new Date(),
          group: {
            id: 'group_1',
            name: 'Test Group',
            ownerId: 'user_1',
            createdAt: new Date(),
            updatedAt: new Date(),
            owner: {
              id: 'user_1',
              email: 'owner@example.com',
              name: 'Owner',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            members: [],
          },
        },
      ];

      prismaMock.groupMember.findMany.mockResolvedValue(mockMemberships);

      const result = await GroupService.getUserGroups('user_1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockMemberships[0].group);
    });
  });
});
