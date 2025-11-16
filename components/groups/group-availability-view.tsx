'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { InteractiveTimeSlotRow } from '@/components/groups/interactive-time-slot-row';
import { ConfirmationControls } from '@/components/calendar/confirmation-controls';
import { TimeSlotModal } from '@/components/calendar/time-slot-modal';
import { useClerkUsers } from '@/hooks/use-clerk-users';
import type { UnavailabilityRange, TimeSlot } from '@/lib/utils/unavailability-grid';

interface GroupAvailabilityViewProps {
  groupIds: string[];
  initialDate?: Date;
  userId: string;
}

interface AvailabilityWindow {
  id: string;
  groupId: string;
  groupName: string;
  startTime: string;
  endTime: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

interface DraftUnavailabilityRange extends UnavailabilityRange {
  // Draft ranges are client-side only until confirmed
}

// Custom hook for fetching and aggregating availability data from multiple groups
function useGroupsAvailability(groupIds: string[], date: Date) {
  const [availabilityWindows, setAvailabilityWindows] = useState<
    AvailabilityWindow[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const calculatedDatesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchAvailability = async () => {
      if (groupIds.length === 0) {
        setAvailabilityWindows([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Normalize date to avoid timezone issues
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        // Format date as YYYY-MM-DD in local timezone (not UTC)
        const year = normalizedDate.getFullYear();
        const month = String(normalizedDate.getMonth() + 1).padStart(2, "0");
        const day = String(normalizedDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        // Get timezone offset in minutes (e.g., -120 for UTC+2)
        const timezoneOffset = normalizedDate.getTimezoneOffset();

        // Check if we need to trigger calculation for this date
        const needsCalculation = !calculatedDatesRef.current.has(dateStr);

        if (needsCalculation) {
          // Mark this date as calculated immediately to prevent duplicate calls
          calculatedDatesRef.current.add(dateStr);

          // Trigger calculation for all groups in parallel
          await Promise.all(
            groupIds.map(async (groupId) => {
              try {
                const calcResponse = await fetch(
                  `/api/groups/${groupId}/availability`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      date: dateStr,
                      timezoneOffset,
                    }),
                  }
                );

                if (!calcResponse.ok) {
                  const errorData = await calcResponse.json();
                  console.error(
                    `Failed to calculate availability for group ${groupId}:`,
                    errorData
                  );
                }
              } catch (err) {
                console.error(
                  `Failed to calculate availability for group ${groupId}:`,
                  err
                );
              }
            })
          );
        }

        // Fetch availability from all groups in parallel
        const responses = await Promise.all(
          groupIds.map(async (groupId) => {
            try {
              const response = await fetch(
                `/api/groups/${groupId}/availability?date=${dateStr}&timezoneOffset=${timezoneOffset}`
              );

              if (!response.ok) {
                const errorData = await response.json();

                // Handle specific error cases
                if (response.status === 404) {
                  console.error(`Group ${groupId} not found`);
                  return null;
                }

                if (response.status === 403) {
                  console.error(`Access denied to group ${groupId}`);
                  return null;
                }

                throw new Error(
                  errorData.error?.message ||
                  `Failed to fetch availability for group ${groupId}`
                );
              }

              const data = await response.json();
              return {
                groupId,
                groupName: data.groupName || "Unknown Group",
                windows: data.windows || [],
              };
            } catch (err) {
              console.error(
                `Error fetching availability for group ${groupId}:`,
                err
              );
              return null;
            }
          })
        );

        // Filter out null responses (failed requests)
        const validResponses = responses.filter(
          (r): r is NonNullable<typeof r> => r !== null
        );

        if (validResponses.length === 0 && groupIds.length > 0) {
          throw new Error("Unable to load availability from any groups");
        }

        // Aggregate all windows from all groups and deduplicate by ID
        const windowsMap = new Map<string, AvailabilityWindow>();
        validResponses.forEach((groupData) => {
          groupData.windows.forEach((window: any) => {
            // Use window ID as key to prevent duplicates
            if (!windowsMap.has(window.id)) {
              windowsMap.set(window.id, {
                ...window,
                groupId: groupData.groupId,
                groupName: groupData.groupName,
              });
            }
          });
        });

        // Convert map to array and sort by start time
        const allWindows = Array.from(windowsMap.values());
        allWindows.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        setAvailabilityWindows(allWindows);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load availability";
        setError(errorMessage);
        toast.error(errorMessage);
        setAvailabilityWindows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [
    groupIds,
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    refreshTrigger,
  ]); // Use date components to avoid timezone issues

  const refresh = () => {
    // Clear the calculated dates cache to force recalculation
    calculatedDatesRef.current.clear();
    // Trigger a re-fetch
    setRefreshTrigger((prev) => prev + 1);
  };

  return { availabilityWindows, loading, error, refresh };
}

// DayPicker component for date selection
interface DayPickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

function DayPicker({ selectedDate, onDateSelect }: DayPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentStartDate, setCurrentStartDate] = useState<Date>(new Date());
  const [dates, setDates] = useState<Date[]>([]);
  const [visibleDays, setVisibleDays] = useState<number>(7);

  useEffect(() => {
    // Initialize to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentStartDate(today);
  }, []);

  useEffect(() => {
    // Calculate how many days can fit in the container
    const calculateVisibleDays = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Account for: button width (40px) * 2 + gaps (12px * 2) + day button (70px) + gaps between days (12px)
        const availableWidth = containerWidth - 40 * 2 - 12 * 2;
        const dayButtonWidth = 70;
        const gapWidth = 12;
        const daysCount = Math.floor(
          (availableWidth + gapWidth) / (dayButtonWidth + gapWidth)
        );
        setVisibleDays(Math.max(3, Math.min(daysCount, 14))); // Min 3, max 14 days
      }
    };

    calculateVisibleDays();
    window.addEventListener("resize", calculateVisibleDays);
    return () => window.removeEventListener("resize", calculateVisibleDays);
  }, []);

  useEffect(() => {
    // Generate dates based on visible days
    const generatedDates: Date[] = [];
    for (let i = 0; i < visibleDays; i++) {
      const date = new Date(currentStartDate);
      date.setDate(currentStartDate.getDate() + i);
      generatedDates.push(date);
    }
    setDates(generatedDates);
  }, [currentStartDate, visibleDays]);

  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentStartDate((prevStart) => {
      const newStart = new Date(prevStart);
      newStart.setDate(
        prevStart.getDate() +
        (direction === "next" ? visibleDays : -visibleDays)
      );
      return newStart;
    });
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const formatDayNumber = (date: Date) => {
    return date.getDate();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleNavigate("prev")}
        className="shrink-0 rounded-full"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-hidden flex-1"
      >
        {dates.map((date, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(date)}
            className={`
              flex flex-col items-center justify-center
              min-w-[70px] w-[70px] h-[70px] rounded-full
              transition-all shrink-0
              ${
                isSelected(date)
              ? "bg-orange-500 text-white shadow-md"
              : "bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-sm"
              }
            `}
          >
            <span className="text-xs font-medium">{formatDayName(date)}</span>
            <span className="text-xl font-bold">{formatDayNumber(date)}</span>
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => handleNavigate("next")}
        className="shrink-0 rounded-full"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// TimeSlotRow component for displaying availability windows
interface TimeSlotRowProps {
  groupName: string;
  startTime: Date;
  endTime: Date;
  participants: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  clerkUsers?: Map<string, { id: string; name: string; imageUrl: string | null; email: string }>;
  onClick?: () => void;
}

function TimeSlotRow({
  groupName,
  startTime,
  endTime,
  participants,
  clerkUsers,
  onClick,
}: TimeSlotRowProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id: string) => {
    // Generate consistent color based on user ID
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-teal-500",
    ];
    const index = id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center justify-between
        bg-white rounded-lg border border-gray-200
        p-4 transition-shadow select-none
        ${onClick ? "cursor-pointer hover:shadow-md" : ""}
      `}
    >
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">
          {formatTime(startTime)} - {formatTime(endTime)}
        </div>
        <div className="text-xs text-muted-foreground">{groupName}</div>
      </div>

      <div className="flex items-center -space-x-2">
        {participants.map((participant) => {
          const clerkUser = clerkUsers?.get(participant.id);
          const imageUrl = clerkUser?.imageUrl;
          const displayName = clerkUser?.name || participant.name;

          return (
            <Avatar
              key={participant.id}
              className="w-8 h-8 border-2 border-white"
              title={displayName}
            >
              <AvatarImage src={imageUrl || undefined} alt={displayName} />
              <AvatarFallback
                className={`${getAvatarColor(participant.id)} text-white text-xs font-semibold`}
              >
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
    </div>
  );
}

// TimeSlotsList component for displaying all time slots
interface TimeSlotsListProps {
  windows: AvailabilityWindow[];
  loading: boolean;
  error: string | null;
  draftRanges: Map<string, DraftUnavailabilityRange[]>;
  clerkUsers?: Map<string, { id: string; name: string; imageUrl: string | null; email: string }>;
  onRangeCreate: (timeSlotId: string, range: UnavailabilityRange) => void;
  onRangeUpdate: (
    timeSlotId: string,
    rangeId: string,
    updates: Partial<UnavailabilityRange>
  ) => void;
  onRangeDelete: (timeSlotId: string, rangeId: string) => void;
  onTimeSlotClick: (window: AvailabilityWindow) => void;
}

function TimeSlotsList({
  windows,
  loading,
  error,
  draftRanges,
  clerkUsers,
  onRangeCreate,
  onRangeUpdate,
  onRangeDelete,
  onTimeSlotClick,
}: TimeSlotsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <p className="text-muted-foreground">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-destructive/5">
        <p className="text-destructive font-medium">
          Unable to load availability
        </p>
        <p className="text-sm text-muted-foreground text-center mt-2">
          {error}
        </p>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Please try again or contact support if the problem persists
        </p>
      </div>
    );
  }

  if (windows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/30">
        <p className="text-lg font-medium text-muted-foreground text-center">
          No availability windows for this date
        </p>
        <p className="text-sm text-muted-foreground text-center mt-2">
          This could mean:
        </p>
        <ul className="text-sm text-muted-foreground text-center mt-2 space-y-1">
          <li>• All group members are busy</li>
          <li>• Not enough members are available at the same time</li>
          <li>• Calendar events haven&apos;t been synced yet</li>
        </ul>
        <p className="text-sm text-muted-foreground text-center mt-3">
          Try selecting a different date or updating your calendar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {windows.map((window) => {
        const timeSlot: TimeSlot = {
          startTime: new Date(window.startTime),
          endTime: new Date(window.endTime),
        };

        const ranges = draftRanges.get(window.id) || [];

        return (
          <InteractiveTimeSlotRow
            key={window.id}
            timeSlot={timeSlot}
            unavailabilityRanges={ranges}
            onRangeCreate={(range) => onRangeCreate(window.id, range)}
            onRangeUpdate={(rangeId, updates) =>
              onRangeUpdate(window.id, rangeId, updates)
            }
            onRangeDelete={(rangeId) => onRangeDelete(window.id, rangeId)}
            onClick={() => onTimeSlotClick(window)}
          >
            <TimeSlotRow
              groupName={window.groupName}
              startTime={new Date(window.startTime)}
              endTime={new Date(window.endTime)}
              participants={window.participants}
              clerkUsers={clerkUsers}
            />
          </InteractiveTimeSlotRow>
        );
      })}
    </div>
  );
}

export function GroupAvailabilityView({
  groupIds,
  initialDate,
  userId,
}: GroupAvailabilityViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const date = initialDate || new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  // State for draft unavailability ranges
  const [draftRanges, setDraftRanges] = useState<
    Map<string, DraftUnavailabilityRange[]>
  >(new Map());

  // State for modal
  const [selectedTimeSlot, setSelectedTimeSlot] =
    useState<AvailabilityWindow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for saving
  const [isSaving, setIsSaving] = useState(false);

  const { availabilityWindows, loading, error, refresh } =
    useGroupsAvailability(groupIds, selectedDate);

  // Extract unique participant IDs from all availability windows
  const participantIds = Array.from(
    new Set(
      availabilityWindows.flatMap((window) =>
        window.participants.map((p) => p.id)
      )
    )
  );

  // Fetch Clerk user data for all participants
  const { users: clerkUsers } = useClerkUsers(participantIds);

  const handleDateSelect = (date: Date) => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    setSelectedDate(normalizedDate);
    // Clear draft ranges when date changes
    setDraftRanges(new Map());
  };

  // Handler for creating a new range
  const handleRangeCreate = (
    timeSlotId: string,
    range: UnavailabilityRange
  ) => {
    setDraftRanges((prev) => {
      const newMap = new Map(prev);
      const existingRanges = newMap.get(timeSlotId) || [];
      newMap.set(timeSlotId, [...existingRanges, range]);
      return newMap;
    });
  };

  // Handler for updating a range
  const handleRangeUpdate = (
    timeSlotId: string,
    rangeId: string,
    updates: Partial<UnavailabilityRange>
  ) => {
    setDraftRanges((prev) => {
      const newMap = new Map(prev);
      const existingRanges = newMap.get(timeSlotId) || [];
      const updatedRanges = existingRanges.map((range) =>
        range.id === rangeId ? { ...range, ...updates } : range
      );
      newMap.set(timeSlotId, updatedRanges);
      return newMap;
    });
  };

  // Handler for deleting a range
  const handleRangeDelete = (timeSlotId: string, rangeId: string) => {
    setDraftRanges((prev) => {
      const newMap = new Map(prev);
      const existingRanges = newMap.get(timeSlotId) || [];
      const filteredRanges = existingRanges.filter(
        (range) => range.id !== rangeId
      );

      if (filteredRanges.length === 0) {
        newMap.delete(timeSlotId);
      } else {
        newMap.set(timeSlotId, filteredRanges);
      }

      return newMap;
    });
  };

  // Handler for confirming unavailability ranges
  const handleConfirm = async () => {
    // Get user timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Collect all draft ranges
    const allRanges: Array<{
      timeSlotId: string;
      range: DraftUnavailabilityRange;
    }> = [];
    draftRanges.forEach((ranges, timeSlotId) => {
      ranges.forEach((range) => {
        allRanges.push({ timeSlotId, range });
      });
    });

    if (allRanges.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      // Create CalendarEvent records for each range
      const createPromises = allRanges.map(async ({ range }) => {
        const response = await fetch("/api/calendar/timeslots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Busy",
            startTime: range.startTime.toISOString(),
            endTime: range.endTime.toISOString(),
            timezone,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to save unavailability"
          );
        }

        return response.json();
      });

      await Promise.all(createPromises);

      // Clear draft ranges on success
      setDraftRanges(new Map());

      // Refresh availability windows to reflect the new unavailability
      refresh();

      toast.success(
        `Successfully saved ${allRanges.length} unavailable ${allRanges.length === 1 ? "period" : "periods"
        }`
      );
    } catch (err) {
      console.error("Error saving unavailability ranges:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save unavailability ranges"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for cancelling draft ranges
  const handleCancel = () => {
    setDraftRanges(new Map());
    toast.info("Cancelled unavailability selection");
  };

  // Handler for opening modal
  const handleTimeSlotClick = (window: AvailabilityWindow) => {
    setSelectedTimeSlot(window);
    setIsModalOpen(true);
  };

  // Calculate total range count
  const totalRangeCount = Array.from(draftRanges.values()).reduce(
    (sum, ranges) => sum + ranges.length,
    0
  );

  // Handle case where user is not in any groups
  if (groupIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Hold and drag to mark unavailable
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/30">
          <p className="text-lg font-medium text-muted-foreground text-center">
            You&apos;re not in any groups yet
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Join or create a group to see availability windows
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Confirmation Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-foreground">
          Hold and drag to mark unavailable
        </h2>

        <ConfirmationControls
          visible={totalRangeCount > 0 && !isSaving}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          rangeCount={totalRangeCount}
        />
      </div>

      {/* Day Picker */}
      <DayPicker selectedDate={selectedDate} onDateSelect={handleDateSelect} />

      {/* Time Slots List */}
      <TimeSlotsList
        windows={availabilityWindows}
        loading={loading}
        error={error}
        draftRanges={draftRanges}
        clerkUsers={clerkUsers}
        onRangeCreate={handleRangeCreate}
        onRangeUpdate={handleRangeUpdate}
        onRangeDelete={handleRangeDelete}
        onTimeSlotClick={handleTimeSlotClick}
      />

      {/* Time Slot Modal */}
      <TimeSlotModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        timeSlot={
          selectedTimeSlot
            ? {
              id: selectedTimeSlot.id,
              title: `${selectedTimeSlot.groupName} - Available Time`,
              startTime: new Date(selectedTimeSlot.startTime),
              endTime: new Date(selectedTimeSlot.endTime),
              description: `${selectedTimeSlot.participants.length} ${selectedTimeSlot.participants.length === 1
                ? "member"
                : "members"
                } available`,
            }
            : null
        }
        groupId={selectedTimeSlot?.groupId || ''}
        userId={userId}
      />
    </div>
  );
}
