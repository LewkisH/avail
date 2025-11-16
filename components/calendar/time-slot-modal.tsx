'use client';

import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';

interface TimeSlot {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

interface EventParticipant {
  id: string;
  name: string;
  imageUrl?: string;
}

interface GroupEvent {
  id: string;
  title: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  category: string;
  participants: EventParticipant[];
  hasJoined?: boolean;
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
  groupId: string;
  userId: string;
}

export function TimeSlotModal({
  open,
  onOpenChange,
  timeSlot,
  groupId,
  userId,
}: TimeSlotModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [availability, setAvailability] = useState<UserAvailability[]>([]);

  // Fetch data when modal opens
  useEffect(() => {
    if (!open || !timeSlot) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          startTime: timeSlot.startTime.toISOString(),
          endTime: timeSlot.endTime.toISOString(),
        });

        const response = await fetch(
          `/api/groups/${groupId}/time-slots/events?${params}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch time slot data');
        }

        const data = await response.json();

        // Convert date strings to Date objects
        const eventsWithDates = data.activitySuggestions.map((event: any) => ({
          ...event,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
        }));

        setEvents(eventsWithDates);
        setAvailability(data.availability);
      } catch (err) {
        console.error('Error fetching time slot data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, timeSlot, groupId]);

  // Handle join event action
  const handleJoinEvent = async (eventId: string) => {
    try {
      const response = await fetch(
        `/api/groups/${groupId}/activity-suggestions/${eventId}/join`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        if (response.status === 409) {
          toast.error('You have already joined this event');
          return;
        }
        throw new Error('Failed to join event');
      }

      const data = await response.json();

      // Update local state with new participant and hasJoined flag
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId
            ? {
              ...event,
              participants: data.participants,
              hasJoined: true,
            }
            : event
        )
      );

      toast.success('Successfully joined the event!');
    } catch (err) {
      console.error('Error joining event:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to join event');
    }
  };

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{timeSlot.title}</DialogTitle>
          <DialogDescription>
            {formatDate(timeSlot.startTime)}
            <br />
            {formatTime(timeSlot.startTime)} - {formatTime(timeSlot.endTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <>
              <TimeSlotEventsSection events={events} onJoinEvent={handleJoinEvent} />

                  <Separator />

                  <TimeSlotAvailabilitySection availability={availability} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
