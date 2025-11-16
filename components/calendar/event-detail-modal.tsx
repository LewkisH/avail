'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatEventTime, getInitials } from '@/lib/utils/time-formatting';
import { useClerkUsers } from '@/hooks/use-clerk-users';
import { ChevronDown, ChevronUp, MapPin, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface EventParticipant {
  id: string;
  name: string;
  imageUrl?: string;
}

interface GroupEvent {
  id: string;
  title: string;
  description?: string;
  location?: string | null;
  startTime: Date;
  endTime: Date;
  category: string;
  imageUrl?: string | null;
  reasoning?: string;
  cost?: number | null;
  participants: EventParticipant[];
  hasJoined?: boolean;
}

interface EventDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GroupEvent | null;
  onJoin?: (eventId: string) => Promise<void>;
  isJoining?: boolean;
  groupId: string;
}

export function EventDetailModal({
  open,
  onOpenChange,
  event,
  onJoin,
  isJoining = false,
  groupId,
}: EventDetailModalProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);

  // Fetch Clerk user data for participants
  const participantIds = participants.map((p) => p.id);
  const { users: clerkUsers, loading: loadingClerkUsers } = useClerkUsers(participantIds);

  // Update participants when event changes
  useEffect(() => {
    if (event) {
      setParticipants(event.participants);
    }
  }, [event]);

  // Handle join button click
  const handleJoinClick = async () => {
    if (!event || !onJoin || event.hasJoined || isJoining) return;

    try {
      await onJoin(event.id);
      toast.success('Successfully joined the event!');
    } catch (error) {
      console.error('Failed to join event:', error);
      toast.error('Failed to join event. Please try again.');
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            {event.category && (
              <Badge variant="secondary" className="text-xs">
                {event.category}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl">{event.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Event details for {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Time and Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatEventTime(event.startTime, event.endTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.location || 'Location TBD'}</span>
            </div>
            {event.cost !== null && event.cost !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${event.cost.toFixed(2)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          {event.description && (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-2">Description</h3>
                <p 
                  id="event-description"
                  className="text-sm text-muted-foreground whitespace-pre-wrap"
                >
                  {event.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Reasoning (Collapsible) */}
          {event.reasoning && (
            <>
              <div>
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="flex items-center justify-between w-full text-left"
                  aria-expanded={showReasoning}
                  aria-controls="reasoning-content"
                >
                  <h3 className="text-sm font-semibold">Why this suggestion?</h3>
                  {showReasoning ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {showReasoning && (
                  <div
                    id="reasoning-content"
                    className="mt-3 p-4 bg-muted/30 rounded-lg"
                  >
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {event.reasoning}
                    </p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Participants */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Participants ({participants.length})
            </h3>
            {loadingClerkUsers ? (
              <div className="grid grid-cols-4 gap-4">
                {[...Array(Math.min(4, participants.length || 4))].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : participants.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {participants.map((participant) => {
                  const clerkUser = clerkUsers.get(participant.id);
                  const imageUrl = clerkUser?.imageUrl || participant.imageUrl;
                  const name = clerkUser?.name || participant.name;

                  return (
                    <div
                      key={participant.id}
                      className="flex flex-col items-center gap-2"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={imageUrl || undefined} alt={name} />
                        <AvatarFallback className="text-sm">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-center line-clamp-2">
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No participants yet. Be the first to join!
              </p>
            )}
          </div>

          {/* Join Button */}
          {onJoin && (
            <>
              <Separator />
              <Button
                onClick={handleJoinClick}
                disabled={event.hasJoined || isJoining}
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                {isJoining ? 'Joining...' : event.hasJoined ? 'Joined' : 'Join Event'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
