'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Users, Mail, LogOut } from 'lucide-react';
import { CreateGroupDialog } from './create-group-dialog';
import { InviteMemberDialog } from './invite-member-dialog';
import { LeaveGroupDialog } from './leave-group-dialog';
import { GroupDetailDialog } from './group-detail-dialog';
import { PendingInvitations } from './pending-invitations';

interface Group {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    id: string;
    userId: string;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export function GroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (name: string) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create group');
      }

      const newGroup = await response.json();
      setGroups([newGroup, ...groups]);
      setCreateDialogOpen(false);
      toast.success('Group created successfully');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create group');
      throw error;
    }
  };

  const handleInviteMember = async (email: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send invitation');
      }

      setInviteDialogOpen(false);
      toast.success(`Invitation sent to ${email}`);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
      throw error;
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/leave`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to leave group');
      }

      setGroups(groups.filter((g) => g.id !== selectedGroup.id));
      setLeaveDialogOpen(false);
      setSelectedGroup(null);
      toast.success('Left group successfully');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to leave group');
      throw error;
    }
  };

  const handleViewDetails = (group: Group) => {
    setSelectedGroup(group);
    setDetailDialogOpen(true);
  };

  const handleInviteClick = (group: Group) => {
    setSelectedGroup(group);
    setInviteDialogOpen(true);
  };

  const handleLeaveClick = (group: Group) => {
    setSelectedGroup(group);
    setLeaveDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading groups...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage your groups and plan activities together
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <PendingInvitations onInvitationAccepted={fetchGroups} />

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first group to start planning activities with friends
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Owner: {group.owner.name}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {group.members.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewDetails(group)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Members
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleInviteClick(group)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => handleLeaveClick(group)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateGroup={handleCreateGroup}
      />

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInviteMember}
        groupName={selectedGroup?.name || ''}
      />

      <LeaveGroupDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        onLeave={handleLeaveGroup}
        groupName={selectedGroup?.name || ''}
      />

      <GroupDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        group={selectedGroup}
      />
    </>
  );
}
