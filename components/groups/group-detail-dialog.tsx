'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Calendar, Crown } from 'lucide-react';

interface GroupMember {
  id: string;
  userId: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    interests?: Array<{ interest: string }>;
    budget?: {
      minBudget: number;
      maxBudget: number;
      currency: string;
    };
  };
}

interface Group {
  id: string;
  name: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface GroupDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
}

export function GroupDetailDialog({
  open,
  onOpenChange,
  group,
}: GroupDetailDialogProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && group) {
      fetchMembers();
    }
  }, [open, group]);

  const fetchMembers = async () => {
    if (!group) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/groups/${group.id}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{group.name}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground -mt-2 mb-4">
          <Users className="h-4 w-4" />
          <span>{members.length} members</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Loading members...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{member.user.name}</h4>
                      {member.userId === group.ownerId && (
                        <Badge variant="default" className="gap-1">
                          <Crown className="h-3 w-3" />
                          Owner
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Joined {formatDate(member.joinedAt)}</span>
                  </div>
                </div>

                {member.user.interests && member.user.interests.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Interests</p>
                    <div className="flex flex-wrap gap-1">
                      {member.user.interests.map((interest, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {interest.interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {member.user.budget && (
                  <div>
                    <p className="text-sm font-medium mb-1">Budget Range</p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.budget.currency} {member.user.budget.minBudget} -{' '}
                      {member.user.budget.maxBudget}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
