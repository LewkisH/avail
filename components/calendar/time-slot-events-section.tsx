'use client';

import { Calendar, Clock } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

interface TimeSlotEventsSectionProps {
  events: Event[];
}

export function TimeSlotEventsSection({ events }: TimeSlotEventsSectionProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (events.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Events
        </h3>
        <p className="text-sm text-muted-foreground">No events scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Events ({events.length})
      </h3>
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-lg border p-3 space-y-1 hover:bg-accent/50 transition-colors"
          >
            <div className="font-medium text-sm">{event.title}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </div>
            {event.description && (
              <p className="text-xs text-muted-foreground">{event.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
