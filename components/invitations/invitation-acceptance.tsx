'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react';

interface InvitationAcceptanceProps {
  token: string;
}

export function InvitationAcceptance({ token }: InvitationAcceptanceProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptInvitation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to accept invitation');
      }

      const membership = await response.json();
      setAccepted(true);
      toast.success('Successfully joined the group!');

      // Redirect to groups page after 2 seconds
      setTimeout(() => {
        router.push('/groups');
      }, 2000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept invitation';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (accepted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Welcome to the group!</h2>
            <p className="text-muted-foreground text-center mb-4">
              You have successfully joined the group. Redirecting to your groups...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Unable to Accept Invitation</h2>
            <p className="text-muted-foreground text-center mb-6">{error}</p>
            <Button onClick={() => router.push('/groups')}>Go to My Groups</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl">Group Invitation</CardTitle>
          <CardDescription className="text-center">
            You have been invited to join a group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Click the button below to accept the invitation and join the group.
          </p>
          <Button className="w-full" onClick={handleAcceptInvitation} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/groups')}
            disabled={loading}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
