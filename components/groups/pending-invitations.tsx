'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Invitation {
  id: string;
  token: string;
  invitedEmail: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  group: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      email: string;
    };
    members: Array<{
      id: string;
      userId: string;
    }>;
  };
  inviter: {
    id: string;
    name: string;
    email: string;
  };
}

interface PendingInvitationsProps {
  onInvitationAccepted?: () => void;
}

export function PendingInvitations({ onInvitationAccepted }: PendingInvitationsProps) {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
    // Poll for new invitations every 30 seconds
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations');
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      const data = await response.json();
      setInvitations(data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (token: string, invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to accept invitation');
      }

      toast.success('Successfully joined the group!');
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      
      // Refresh the groups list to show the new group
      if (onInvitationAccepted) {
        onInvitationAccepted();
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (token: string, invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const response = await fetch(`/api/invitations/${token}/decline`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to decline invitation');
      }

      // Remove the invitation from the list
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      toast.success('Invitation declined');
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    } else {
      return 'Expiring soon';
    }
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (invitations.length === 0) {
    return null; // Don't show the section if there are no invitations
  }

  return (
    <Card className="mb-6 border-primary/50 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Pending Invitations</CardTitle>
          <Badge variant="default">{invitations.length}</Badge>
        </div>
        <CardDescription>You have been invited to join these groups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <Card key={invitation.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="font-semibold text-lg">{invitation.group.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Invited by {invitation.inviter.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{invitation.group.members.length} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeRemaining(invitation.expiresAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invitation.token, invitation.id)}
                    disabled={processingId === invitation.id}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(invitation.token, invitation.id)}
                    disabled={processingId === invitation.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
