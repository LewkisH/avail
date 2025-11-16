'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format, isToday, isTomorrow } from 'date-fns';

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
  imageUrl?: string | null;
  participants: EventParticipant[];
  hasJoined?: boolean;
}

interface TimeSlotEventsSectionProps {
  events: GroupEvent[];
  onJoinEvent?: (eventId: string) => Promise<void>;
}

export function TimeSlotEventsSection({ events, onJoinEvent }: TimeSlotEventsSectionProps) {
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const formatEventTime = (startTime: Date, endTime: Date) => {
    const formatTime = (date: Date) => format(date, 'HH:mm');

    if (isToday(startTime)) {
      return `Today ${formatTime(startTime)}-${formatTime(endTime)}`;
    } else if (isTomorrow(startTime)) {
      return `Tomorrow ${formatTime(startTime)}-${formatTime(endTime)}`;
    } else {
      return `${format(startTime, 'd MMM')} ${formatTime(startTime)}-${formatTime(endTime)}`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (events.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">No events scheduled</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {events.slice(0, 6).map((event) => (
          <div
            key={event.id}
            className="relative px-4 py-5 rounded-2xl flex flex-col gap-3 border overflow-hidden"
            style={{
              background: event.imageUrl
                ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url(${event.imageUrl})`
                : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center">
                <div className="px-2 py-1.5 bg-neutral-800/50 rounded-xl backdrop-blur-[3px] flex items-center">
                  <div className="text-neutral-200 text-sm font-normal leading-5">
                    {event.category}
                  </div>
                </div>
              </div>
              <div className="text-white text-base font-semibold leading-5">
                {event.title}
                {event.location && (
                  <span className="block text-sm font-normal text-neutral-300 mt-1">
                    @ {event.location}
                  </span>
                )}
              </div>
            </div>

            <div className="text-neutral-200 text-sm font-medium leading-5">
              {formatEventTime(event.startTime, event.endTime)}
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <div className="h-7 flex items-center -space-x-2">
                {event.participants.slice(0, 3).map((participant) => (
                  <div
                    key={participant.id}
                    className="relative rounded-full ring-2 ring-background overflow-hidden"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={participant.imageUrl} alt={participant.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                {event.participants.length > 3 && (
                  <div className="relative rounded-full ring-2 ring-background bg-neutral-700 h-7 w-7 flex items-center justify-center">
                    <span className="text-xs text-neutral-200">
                      +{event.participants.length - 3}
                    </span>
                  </div>
                )}
              </div>

              {onJoinEvent && (
                <Button
                  onClick={async () => {
                    setJoiningEventId(event.id);
                    try {
                      await onJoinEvent(event.id);
                    } finally {
                      setJoiningEventId(null);
                    }
                  }}
                  disabled={event.hasJoined || joiningEventId === event.id}
                  className="w-full min-h-8 px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
                >
                  {joiningEventId === event.id ? 'Joining...' : event.hasJoined ? 'Joined' : 'Join'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
