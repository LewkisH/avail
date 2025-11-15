'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Calendar, CheckCircle2 } from 'lucide-react';

interface SyncInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SyncInfoDialog({ open, onOpenChange, onConfirm }: SyncInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5" />
            Google Calendar Sync
          </DialogTitle>
          <DialogDescription>
            Connecting your Google Calendar enables bidirectional synchronization between Avails and Google Calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                <CheckCircle2 className="size-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-medium">Avails → Google Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Time slots you create in Avails will automatically appear in your Google Calendar.
                  Updates and deletions will also sync.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                <CheckCircle2 className="size-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-medium">Google Calendar → Avails</h4>
                <p className="text-sm text-muted-foreground">
                  Events from your Google Calendar will be imported as time slots in Avails.
                  Changes in Google Calendar will sync to Avails.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Calendar className="size-4 mt-0.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                You'll be redirected to Google to grant calendar access permissions. 
                You can disconnect at any time from your calendar settings.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Continue to Google
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
