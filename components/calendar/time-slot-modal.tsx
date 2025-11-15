'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { TimeSlotEventsSection } from './time-slot-events-section';
import { TimeSlotAvailabilitySection } from './time-slot-availability-section';

interface TimeSlot {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

interface UserAvailability {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface TimeSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot: TimeSlot | null;
  events?: Event[];
  availability?: UserAvailability[];
}

export function TimeSlotModal({
  open,
  onOpenChange,
  timeSlot,
  events = [],
  availability = []
}: TimeSlotModalProps) {
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
        
        <div className="space-y-4 py-4">
          <TimeSlotEventsSection events={events} />

          <Separator />

          <TimeSlotAvailabilitySection availability={availability} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
