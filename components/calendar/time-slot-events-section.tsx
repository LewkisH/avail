'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/calendar/event-card';
import { EventDetailModal } from '@/components/calendar/event-detail-modal';

interface EventParticipant {
  id: string;
  name: string;
  imageUrl?: string;
}

interface GroupEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  category: string;
  imageUrl?: string | null;
  reasoning?: string;
  isExternalEvent?: boolean;
  externalEventId?: string | null;
  participants: EventParticipant[];
  hasJoined?: boolean;
}

interface TimeSlotEventsSectionProps {
  events: GroupEvent[];
  onJoinEvent?: (eventId: string) => Promise<void>;
  groupId?: string;
  startTime?: Date;
  endTime?: Date;
  onSuggestionsGenerated?: (suggestions: GroupEvent[]) => void;
}

export function TimeSlotEventsSection({
  events,
  onJoinEvent,
  groupId,
  startTime,
  endTime,
  onSuggestionsGenerated,
}: TimeSlotEventsSectionProps) {
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [localEvents, setLocalEvents] = useState<GroupEvent[]>(events);

  // Update local events when props change
  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  const selectedEvent = localEvents.find((e) => e.id === selectedEventId) || null;

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!onJoinEvent) return;

    setJoiningEventId(eventId);
    try {
      await onJoinEvent(eventId);
      // Update local events to reflect the join
      setLocalEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, hasJoined: true } : event
        )
      );
    } finally {
      setJoiningEventId(null);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!groupId || !startTime || !endTime) {
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch(
        `/api/groups/${groupId}/time-slots/generate-suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();

      // Convert date strings to Date objects
      const newSuggestions = data.suggestions.map((suggestion: any) => ({
        ...suggestion,
        startTime: new Date(suggestion.startTime),
        endTime: new Date(suggestion.endTime),
      }));

      // Update local events
      setLocalEvents(newSuggestions);

      // Call the callback to update the parent component
      if (onSuggestionsGenerated) {
        onSuggestionsGenerated(newSuggestions);
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setGenerationError(
        err instanceof Error ? err.message : 'Failed to generate suggestions'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const shouldShowAIButton = localEvents.length < 6 && groupId && startTime && endTime;

  if (localEvents.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No events scheduled</p>
        {shouldShowAIButton && (
          <Button
            onClick={handleGenerateSuggestions}
            disabled={isGenerating}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">⚙️</span>
                Generating...
              </>
            ) : (
              'Generate AI Suggestions'
            )}
          </Button>
        )}
        {generationError && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{generationError}</p>
            <Button
              onClick={handleGenerateSuggestions}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {localEvents.slice(0, 6).map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onJoin={onJoinEvent ? handleJoinEvent : undefined}
            onClick={handleEventClick}
            isJoining={joiningEventId === event.id}
          />
        ))}
      </div>

      {shouldShowAIButton && (
        <div className="space-y-2">
          <Button
            onClick={handleGenerateSuggestions}
            disabled={isGenerating}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">⚙️</span>
                Generating...
              </>
            ) : (
              'Generate AI Suggestions'
            )}
          </Button>
          {generationError && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{generationError}</p>
              <Button
                onClick={handleGenerateSuggestions}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      )}

      {groupId && (
        <EventDetailModal
          open={selectedEventId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedEventId(null);
            }
          }}
          event={selectedEvent}
          onJoin={onJoinEvent ? handleJoinEvent : undefined}
          isJoining={joiningEventId === selectedEvent?.id}
          groupId={groupId}
        />
      )}
    </div>
  );
}
