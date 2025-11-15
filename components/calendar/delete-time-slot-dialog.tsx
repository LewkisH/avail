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
import { toast } from 'sonner';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimeSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

interface DeleteTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot: TimeSlot | null;
  onSuccess: () => void;
}

export function DeleteTimeSlotDialog({
  open,
  onOpenChange,
  timeSlot,
  onSuccess,
}: DeleteTimeSlotDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDelete = async () => {
    if (!timeSlot) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/calendar/timeslots/${timeSlot.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete time slot');
      }

      toast.success('Time slot deleted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete time slot');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
    }
  };

  if (!timeSlot) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <DialogTitle className="text-lg sm:text-xl">Delete Time Slot</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Are you sure you want to delete this time slot? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <h4 className="font-semibold text-base break-words">{timeSlot.title}</h4>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="break-words">
                {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground break-words">
              {formatDate(timeSlot.startTime)}
            </div>
            {timeSlot.description && (
              <div className="text-sm text-muted-foreground pt-2 border-t break-words">
                {timeSlot.description}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-h-[44px]"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
