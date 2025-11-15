'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TimeSlot {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

interface TimeSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot: TimeSlot | null;
}

export function TimeSlotModal({ open, onOpenChange, timeSlot }: TimeSlotModalProps) {
  if (!timeSlot) {
    return null;
  }

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{timeSlot.title}</DialogTitle>
          <DialogDescription>
            {formatDate(timeSlot.startTime)}
            <br />
            {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Additional actions and functionality will be available here in the future.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
