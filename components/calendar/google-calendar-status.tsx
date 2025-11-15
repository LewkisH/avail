'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Unplug,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ConnectionStatus {
  connected: boolean;
  connectedAt?: Date;
  lastSyncAt?: Date;
  error?: string;
}

interface GoogleCalendarStatusProps {
  status: ConnectionStatus;
  onSync: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function GoogleCalendarStatus({ 
  status, 
  onSync, 
  onDisconnect 
}: GoogleCalendarStatusProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
      toast.success('Calendar synced successfully');
    } catch (error) {
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to sync calendar'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect();
      toast.success('Google Calendar disconnected');
      setShowDisconnectDialog(false);
    } catch (error) {
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to disconnect'
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!status.connected) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted p-2">
            <XCircle className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Not Connected</p>
            <p className="text-xs text-muted-foreground">
              Connect your Google Calendar to enable sync
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="rounded-full bg-green-500/10 p-2">
                <CheckCircle2 className="size-5 text-green-600 dark:text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Connected to Google Calendar</p>
                {status.connectedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connected {formatDistanceToNow(new Date(status.connectedAt), { addSuffix: true })}
                  </p>
                )}
                {status.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced {formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {status.error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3">
              <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-destructive">Sync Error</p>
                <p className="text-xs text-destructive/80 mt-0.5">{status.error}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="min-h-[36px]"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Sync Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnectDialog(true)}
              disabled={isSyncing}
              className="min-h-[36px]"
            >
              <Unplug className="size-4" />
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Disconnect Google Calendar?</DialogTitle>
            <DialogDescription>
              This will stop syncing between Avails and your Google Calendar. 
              Your existing time slots will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
