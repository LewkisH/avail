'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeInput } from "@/components/ui/time-input";
import { toast } from 'sonner';
import { getUserTimezone } from '@/lib/utils/timezone';
import { DurationSlider } from '@/components/calendar/duration-slider';

interface TimeSlot {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

interface TimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot?: TimeSlot;
  onSuccess: () => void;
}

const timeSlotSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    duration: z.number().min(15, 'Duration must be at least 15 minutes').max(2880, 'Duration cannot exceed 48 hours'),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  })
  .refine(
    (data) => {
      // Validate date is not in the past
      const selectedDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    },
    {
      message: 'Date cannot be in the past',
      path: ['date'],
    }
  );

type TimeSlotFormData = z.infer<typeof timeSlotSchema>;

// Duration presets for quick selection
const DURATION_PRESETS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
  { label: '3 hrs', minutes: 180 },
  { label: '4 hrs', minutes: 240 },
] as const;

// Helper function to calculate end time from start time and duration
function calculateEndTime(
  date: string,
  startTime: string,
  durationMinutes: number
): { endTime: string; endDate: string } | null {
  // Validate inputs before processing
  if (!date || !startTime || !durationMinutes) {
    return null;
  }

  // Validate startTime format (HH:MM)
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(startTime)) {
    return null;
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return null;
  }

  const [hours, minutes] = startTime.split(':').map(Number);
  const startDateTime = new Date(date);
  
  // Check if date is valid
  if (isNaN(startDateTime.getTime())) {
    return null;
  }

  startDateTime.setHours(hours, minutes, 0, 0);

  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  return {
    endTime: endDateTime.toTimeString().slice(0, 5), // HH:MM
    endDate: endDateTime.toISOString().split('T')[0], // YYYY-MM-DD
  };
}

// Helper function to format duration in human-readable format
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} minutes`;
}

export function TimeSlotDialog({ open, onOpenChange, timeSlot, onSuccess }: TimeSlotDialogProps) {
  const isEditMode = !!timeSlot;
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const form = useForm<TimeSlotFormData>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      title: '',
      date: '',
      startTime: '',
      duration: 60, // Default 1 hour
      description: '',
    },
  });

  // Reset form when dialog opens/closes or timeSlot changes
  useEffect(() => {
    if (open) {
      if (timeSlot) {
        // Convert UTC dates to local timezone for display in form
        const startDate = new Date(timeSlot.startTime);
        const endDate = new Date(timeSlot.endTime);

        // Calculate duration in minutes
        const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

        // Extract date and time components
        const date = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const time = startDate.toTimeString().slice(0, 5); // HH:MM

        form.reset({
          title: timeSlot.title,
          date: date,
          startTime: time,
          duration: durationMinutes,
          description: timeSlot.description || '',
        });

        // Clear preset selection when editing
        setSelectedPreset(null);
      } else {
        form.reset({
          title: '',
          date: '',
          startTime: '',
          duration: 60, // Default 1 hour
          description: '',
        });

        // Set default preset to 1 hour
        setSelectedPreset(60);
      }
    }
  }, [open, timeSlot, form]);

  const onSubmit = async (data: TimeSlotFormData) => {
    try {
      // Get user's timezone for API
      const timezone = getUserTimezone();
      
      // Convert date + time + duration to UTC ISO strings for API
      const [hours, minutes] = data.startTime.split(':').map(Number);
      const startDateTime = new Date(data.date);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime.getTime() + data.duration * 60000);

      const payload = {
        title: data.title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        description: data.description || undefined,
        timezone,
      };

      const url = isEditMode
        ? `/api/calendar/timeslots/${timeSlot.id}`
        : '/api/calendar/timeslots';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to save time slot');
      }

      toast.success(isEditMode ? 'Time slot updated successfully' : 'Time slot created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!form.formState.isSubmitting) {
      onOpenChange(newOpen);
    }
  };

  const handlePresetSelect = (minutes: number) => {
    form.setValue('duration', minutes);
    setSelectedPreset(minutes);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditMode ? "Edit Time Slot" : "Add Time Slot"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditMode
              ? "Update your available time slot details"
              : "Add a new time slot to your calendar"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Section: Title and Description */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., At the dentist"
                        {...field}
                        disabled={form.formState.isSubmitting}
                        className="min-h-[44px] text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Description (Optional)
                    </FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Add any additional details..."
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date & Time Section */}
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-sm font-semibold text-foreground">
                Date & Time
              </h3>

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        disabled={form.formState.isSubmitting}
                        className="min-h-[44px] text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Start Time
                    </FormLabel>
                    <FormControl>
                      <TimeInput
                        {...field}
                        disabled={form.formState.isSubmitting}
                        className="min-h-[44px] text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration Section */}
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-sm font-semibold text-foreground">
                Duration
              </h3>

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Quick Select
                    </FormLabel>

                    {/* Duration preset buttons */}
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                      {DURATION_PRESETS.map((preset) => (
                        <Button
                          key={preset.minutes}
                          type="button"
                          variant={
                            selectedPreset === preset.minutes
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handlePresetSelect(preset.minutes)}
                          disabled={form.formState.isSubmitting}
                          className="min-h-[44px] min-w-[44px] flex-shrink-0 px-4 text-sm"
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                    {/* Duration slider */}
                    <div className="pt-4 space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Adjust Duration
                      </FormLabel>
                      <DurationSlider
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          // Clear preset selection when manually adjusting duration via slider
                          setSelectedPreset(null);
                        }}
                        min={15}
                        max={2880}
                        step={15}
                        disabled={form.formState.isSubmitting}
                      />
                    </div>

                    {/* End time display */}
                    {form.watch("date") && form.watch("startTime") && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">End time:</span>{" "}
                          {(() => {
                            const result = calculateEndTime(
                              form.watch("date"),
                              form.watch("startTime"),
                              field.value
                            );
                            
                            if (!result) {
                              return "Invalid time";
                            }

                            const { endTime, endDate } = result;
                            const startDate = form.watch("date");

                            // Format time in 24-hour format
                            const formattedTime = endTime;

                            // Show date if it differs from start date (multi-day slot)
                            if (endDate !== startDate) {
                              const endDateObj = new Date(endDate);
                              const formattedDate =
                                endDateObj.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                });
                              return `${formattedTime} (${formattedDate})`;
                            }

                            return formattedTime;
                          })()}
                        </p>
                        {(() => {
                          const result = calculateEndTime(
                            form.watch("date"),
                            form.watch("startTime"),
                            field.value
                          );
                          
                          if (!result) {
                            return null;
                          }

                          const { endDate } = result;
                          const startDate = form.watch("date");

                          // Show multi-day indicator if slot spans multiple days
                          if (endDate !== startDate) {
                            const startDateObj = new Date(startDate);
                            const endDateObj = new Date(endDate);
                            const daysDiff = Math.ceil(
                              (endDateObj.getTime() - startDateObj.getTime()) /
                                (1000 * 60 * 60 * 24)
                            );

                            return (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                This time slot spans {daysDiff}{" "}
                                {daysDiff === 1 ? "day" : "days"}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions Section */}
            <DialogFooter className="gap-2 pt-4 border-t sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
                className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[100px]"
              >
                {form.formState.isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
