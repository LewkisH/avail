'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LeaveGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeave: () => Promise<void>;
  groupName: string;
}

export function LeaveGroupDialog({
  open,
  onOpenChange,
  onLeave,
  groupName,
}: LeaveGroupDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleLeave = async () => {
    setLoading(true);
    try {
      await onLeave();
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave {groupName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleLeave}
            disabled={loading}
          >
            {loading ? 'Leaving...' : 'Leave Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
