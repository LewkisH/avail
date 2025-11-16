'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatEventTime, getInitials } from '@/lib/utils/time-formatting';
import { useClerkUsers } from '@/hooks/use-clerk-users';
import { cn } from '@/lib/utils';

interface EventParticipant {
  id: string;
  name: string;
  imageUrl?: string;
}

interface EventCardProps {
  event: {
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
  };
  onJoin?: (eventId: string) => Promise<void>;
  onClick?: (eventId: string) => void;
  isJoining?: boolean;
  size?: 'default' | 'compact';
}

export function EventCard({
  event,
  onJoin,
  onClick,
  isJoining = false,
  size = 'default',
}: EventCardProps) {
  // Fetch Clerk user data for participants
  const participantIds = event.participants.map((p) => p.id);
  const { users: clerkUsers, loading: loadingClerkUsers } = useClerkUsers(participantIds);

  // Handle card click
  const handleCardClick = () => {
    if (onClick) {
      onClick(event.id);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  // Handle join button click
  const handleJoinClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onJoin && !event.hasJoined && !isJoining) {
      await onJoin(event.id);
    }
  };

  // Size-specific styles
  const sizeStyles = {
    default: {
      container: 'px-4 py-5 rounded-2xl',
      title: 'text-base',
      location: 'text-sm',
      time: 'text-sm',
      badge: 'text-sm',
      avatar: 'h-7 w-7',
      avatarText: 'text-xs',
      button: 'min-h-8 px-3 py-1.5 text-sm',
    },
    compact: {
      container: 'px-3 py-4 rounded-xl',
      title: 'text-sm',
      location: 'text-xs',
      time: 'text-xs',
      badge: 'text-xs',
      avatar: 'h-6 w-6',
      avatarText: 'text-[10px]',
      button: 'min-h-7 px-2.5 py-1 text-xs',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex flex-col gap-3 border overflow-hidden cursor-pointer transition-all',
        'hover:bg-accent/10 hover:-translate-y-0.5 hover:shadow-lg',
        styles.container
      )}
      style={{
        background: event.imageUrl
          ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url(${event.imageUrl})`
          : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      aria-label={`${event.title} at ${event.location || 'TBD'} on ${formatEventTime(event.startTime, event.endTime)}`}
    >
      {/* Category Badge and Title */}
      <div className="flex flex-col gap-3">
        {event.category && (
          <div className="flex items-center">
            <div className={cn(
              'px-2 py-1.5 bg-neutral-800/50 rounded-xl backdrop-blur-[3px] flex items-center',
              styles.badge
            )}>
              <div className="text-neutral-200 font-normal leading-5">
                {event.category}
              </div>
            </div>
          </div>
        )}
        
        <div className={cn('text-white font-semibold leading-5', styles.title)}>
          {event.title}
          {event.location ? (
            <span className={cn('block font-normal text-neutral-300 mt-1', styles.location)}>
              @ {event.location}
            </span>
          ) : (
            <span className={cn('block font-normal text-neutral-300 mt-1', styles.location)}>
              @ Location TBD
            </span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className={cn('text-neutral-200 font-medium leading-5', styles.time)}>
        {formatEventTime(event.startTime, event.endTime)}
      </div>

      {/* Participants and Join Button */}
      <div className="flex flex-col gap-3 mt-auto">
        {/* Participant Avatars */}
        <div className={cn('flex items-center -space-x-2', styles.avatar)}>
          {event.participants.slice(0, 3).map((participant) => {
            const clerkUser = clerkUsers.get(participant.id);
            const imageUrl = clerkUser?.imageUrl || participant.imageUrl;
            const name = clerkUser?.name || participant.name;

            return (
              <div
                key={participant.id}
                className="relative rounded-full ring-2 ring-background overflow-hidden"
              >
                <Avatar className={styles.avatar}>
                  <AvatarImage src={imageUrl || undefined} alt={name} />
                  <AvatarFallback className={styles.avatarText}>
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            );
          })}
          {event.participants.length > 3 && (
            <div className={cn(
              'relative rounded-full ring-2 ring-background bg-neutral-700 flex items-center justify-center',
              styles.avatar
            )}>
              <span className={cn('text-neutral-200', styles.avatarText)}>
                +{event.participants.length - 3}
              </span>
            </div>
          )}
        </div>

        {/* Join Button */}
        {onJoin && (
          <Button
            onClick={handleJoinClick}
            disabled={event.hasJoined || isJoining}
            className={cn(
              'w-full bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50',
              styles.button
            )}
          >
            {isJoining ? 'Joining...' : event.hasJoined ? 'Joined' : 'Join'}
          </Button>
        )}
      </div>
    </div>
  );
}
