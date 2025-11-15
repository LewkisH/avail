'use client';

import { Users, UserCheck, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvailability {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface TimeSlotAvailabilitySectionProps {
  availability: UserAvailability[];
}

export function TimeSlotAvailabilitySection({ availability }: TimeSlotAvailabilitySectionProps) {
  const availableUsers = availability.filter((user) => user.isAvailable);
  const unavailableUsers = availability.filter((user) => !user.isAvailable);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (availability.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Availability
        </h3>
        <p className="text-sm text-muted-foreground">No availability data</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Users className="h-4 w-4" />
        Availability
      </h3>

      {availableUsers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
            <UserCheck className="h-3.5 w-3.5" />
            Available ({availableUsers.length})
          </div>
          <div className="space-y-1.5">
            {availableUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 rounded-md p-2 hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.imageUrl} alt={user.name} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unavailableUsers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
            <UserX className="h-3.5 w-3.5" />
            Unavailable ({unavailableUsers.length})
          </div>
          <div className="space-y-1.5">
            {unavailableUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 rounded-md p-2 opacity-60 hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.imageUrl} alt={user.name} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
