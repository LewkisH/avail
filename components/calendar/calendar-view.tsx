"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Calendar, ChevronLeft, ChevronRight, Clock, Edit, Trash2 } from "lucide-react";
import { TimeSlotDialog } from "./time-slot-dialog";
import { DeleteTimeSlotDialog } from "./delete-time-slot-dialog";
import { GoogleCalendarStatus } from "./google-calendar-status";
import { GoogleCalendarConnect } from "./google-calendar-connect";
import { formatTimeDisplay, formatDateDisplay, getUserTimezone } from "@/lib/utils/timezone";

interface TimeSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

interface ConnectionStatus {
  connected: boolean;
  connectedAt?: Date;
  lastSyncAt?: Date;
  error?: string;
}

type ViewMode = "day" | "week";

export function CalendarView() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetchTimeSlots();
    fetchConnectionStatus();

    // Check for OAuth callback messages
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success === 'connected') {
      toast.success('Google Calendar connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', '/calendar');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: 'You denied access to Google Calendar',
        invalid_callback: 'Invalid OAuth callback parameters',
        connection_failed: 'Failed to connect to Google Calendar. Please try again.',
      };
      toast.error(errorMessages[error] || 'An error occurred during connection');
      // Clean up URL
      window.history.replaceState({}, '', '/calendar');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      const response = await fetch(
        `/api/calendar/timeslots?start=${start.toISOString()}&end=${end.toISOString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch time slots");
      }

      const data = await response.json();
      setTimeSlots(data);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      toast.error("Failed to load time slots");
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      setStatusLoading(true);
      const response = await fetch('/api/calendar/google/status');

      if (!response.ok) {
        throw new Error('Failed to fetch connection status');
      }

      const data = await response.json();
      setConnectionStatus({
        connected: data.connected,
        connectedAt: data.connectedAt ? new Date(data.connectedAt) : undefined,
        lastSyncAt: data.lastSyncAt ? new Date(data.lastSyncAt) : undefined,
        error: data.error,
      });
    } catch (error) {
      console.error('Error fetching connection status:', error);
      // Don't show error toast for status fetch - just log it
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      const response = await fetch('/api/calendar/google/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync calendar');
      }

      const data = await response.json();

      // Show sync results
      const messages = [];
      if (data.created > 0) messages.push(`${data.created} created`);
      if (data.updated > 0) messages.push(`${data.updated} updated`);
      if (data.deleted > 0) messages.push(`${data.deleted} deleted`);

      const message = messages.length > 0
        ? `Sync complete: ${messages.join(', ')}`
        : 'Sync complete: No changes';

      toast.success(message);

      // Refresh calendar view and connection status
      await fetchTimeSlots();
      await fetchConnectionStatus();
    } catch (error) {
      throw error; // Re-throw to be handled by GoogleCalendarStatus component
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/calendar/google/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }

      // Update connection status
      setConnectionStatus({ connected: false });
    } catch (error) {
      throw error; // Re-throw to be handled by GoogleCalendarStatus component
    }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      // Week view - start from Monday
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date) => {
    return formatDateDisplay(date);
  };

  const formatTime = (dateString: string) => {
    // Convert UTC time from API to user's local timezone for display
    return formatTimeDisplay(dateString);
  };

  const getWeekRangeDisplay = () => {
    const { start, end } = getDateRange();
    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear !== endYear) {
      return `${startMonth} ${start.getDate()}, ${startYear} - ${endMonth} ${end.getDate()}, ${endYear}`;
    } else if (startMonth !== endMonth) {
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${startYear}`;
    } else {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${startYear}`;
    }
  };

  const getWeekDays = () => {
    const { start } = getDateRange();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getTimeSlotsForDay = (date: Date) => {
    const timezone = getUserTimezone();
    return timeSlots.filter((slot) => {
      // Convert UTC time to user's timezone for comparison
      const slotDate = new Date(slot.startTime);
      const slotDateStr = slotDate.toLocaleDateString('en-US', { timeZone: timezone });
      const targetDateStr = date.toLocaleDateString('en-US', { timeZone: timezone });
      return slotDateStr === targetDateStr;
    });
  };

  const handleEdit = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setEditDialogOpen(true);
  };

  const handleDelete = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setDeleteDialogOpen(true);
  };

  const handleAddSuccess = () => {
    fetchTimeSlots();
    setAddDialogOpen(false);
  };

  const handleEditSuccess = () => {
    fetchTimeSlots();
    setEditDialogOpen(false);
    setSelectedTimeSlot(null);
  };

  const handleDeleteSuccess = () => {
    fetchTimeSlots();
    setDeleteDialogOpen(false);
    setSelectedTimeSlot(null);
  };

  const renderDayView = () => {
    const daySlots = getTimeSlotsForDay(currentDate);

    return (
      <div className="space-y-4">
        {daySlots.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">No time slots for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {daySlots.map((slot) => (
              <Card 
                key={slot.id} 
                className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => handleEdit(slot)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base sm:text-lg break-words">{slot.title}</h4>
                      <div className="flex items-center gap-2 mt-2 text-sm sm:text-base text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="break-words">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </span>
                      </div>
                      {slot.description && (
                        <p className="text-sm sm:text-base text-muted-foreground mt-2 line-clamp-2 break-words">
                          {slot.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(slot);
                        }}
                        className="min-w-[44px] min-h-[44px]"
                        aria-label="Edit time slot"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(slot);
                        }}
                        className="text-destructive hover:text-destructive min-w-[44px] min-h-[44px]"
                        aria-label="Delete time slot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 sm:gap-4">
        {weekDays.map((day) => {
          const daySlots = getTimeSlotsForDay(day);
          const isToday =
            day.toDateString() === new Date().toDateString();

          return (
            <div
              key={day.toISOString()}
              className={`border rounded-lg p-3 min-h-[200px] ${
                isToday ? "bg-accent/50 border-primary" : ""
              }`}
            >
              <div className="text-center mb-3 pb-2 border-b">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-lg sm:text-xl font-semibold ${isToday ? "text-primary" : ""}`}>
                  {day.getDate()}
                </p>
              </div>
              <div className="space-y-2">
                {daySlots.map((slot) => (
                  <Card
                    key={slot.id}
                    className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-transform min-h-[44px] flex items-center"
                    onClick={() => handleEdit(slot)}
                  >
                    <CardContent className="p-2 sm:p-3 w-full">
                      <p className="text-xs sm:text-sm font-semibold truncate break-words">{slot.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(slot.startTime)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <p className="text-sm sm:text-base text-muted-foreground">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold break-words">Calendar</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your available time slots</p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="min-h-[44px] w-full sm:w-auto"
          aria-label="Add new time slot"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Time Slot
        </Button>
      </div>

      {/* Google Calendar Integration */}
      {!statusLoading && (
        connectionStatus.connected ? (
          <GoogleCalendarStatus
            status={connectionStatus}
            onSync={handleSync}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <GoogleCalendarConnect />
        )
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-semibold break-words px-2">
                {viewMode === "week" ? getWeekRangeDisplay() : formatDate(currentDate)}
              </h3>
              <p className="text-sm text-muted-foreground h-5">
                {viewMode === "day" && currentDate.toLocaleDateString("en-US", { weekday: "long" })}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigatePrevious}
                  className="min-w-[44px] min-h-[44px]"
                  aria-label="Previous period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={navigateToday}
                  className="min-h-[44px] px-6"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigateNext}
                  className="min-w-[44px] min-h-[44px]"
                  aria-label="Next period"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant={viewMode === "day" ? "default" : "outline"}
                  onClick={() => setViewMode("day")}
                  className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[80px]"
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "outline"}
                  onClick={() => setViewMode("week")}
                  className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[80px]"
                >
                  Week
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "day" ? renderDayView() : renderWeekView()}
        </CardContent>
      </Card>

      <TimeSlotDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />
      <TimeSlotDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        timeSlot={selectedTimeSlot ? {
          ...selectedTimeSlot,
          startTime: new Date(selectedTimeSlot.startTime),
          endTime: new Date(selectedTimeSlot.endTime),
        } : undefined}
        onSuccess={handleEditSuccess}
      />
      <DeleteTimeSlotDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        timeSlot={selectedTimeSlot}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
