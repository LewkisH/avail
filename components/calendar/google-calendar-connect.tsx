'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SyncInfoDialog } from './sync-info-dialog';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleCalendarConnectProps {
  onConnect?: () => void;
}

export function GoogleCalendarConnect({ onConnect }: GoogleCalendarConnectProps) {
  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectClick = () => {
    setShowSyncInfo(true);
  };

  const handleConfirm = async () => {
    setShowSyncInfo(false);
    setIsConnecting(true);

    try {
      const response = await fetch('/api/calendar/google/connect');
      
      if (!response.ok) {
        throw new Error('Failed to initiate Google Calendar connection');
      }

      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error) {
      setIsConnecting(false);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to connect to Google Calendar'
      );
    }
  };

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Calendar className="size-6 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">Connect Google Calendar</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sync your Avails time slots with Google Calendar automatically
              </p>
            </div>
            <Button
              onClick={handleConnectClick}
              disabled={isConnecting}
              className="min-h-[44px]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="size-4" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <SyncInfoDialog
        open={showSyncInfo}
        onOpenChange={setShowSyncInfo}
        onConfirm={handleConfirm}
      />
    </>
  );
}
