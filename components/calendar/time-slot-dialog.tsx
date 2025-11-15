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
import { toast } from 'sonner';
import { getUserTimezone } from '@/lib/utils/timezone';

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
): { endTime: string; endDate: string } {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDateTime = new Date(date);
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
      <DialogContent className="sm:max-w-[425px] max-sm:max-h-[90vh] max-sm:overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{isEditMode ? 'Edit Time Slot' : 'Add Time Slot'}</DialogTitle>
          <DialogDescription className="text-sm">
            {isEditMode
              ? 'Update your available time slot details'
              : 'Add a new time slot to your calendar'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Available for lunch"
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={form.formState.isSubmitting}
                      className="min-h-[44px]"
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
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      disabled={form.formState.isSubmitting}
                      className="min-h-[44px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>

                  {/* Duration preset buttons */}
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {DURATION_PRESETS.map((preset) => (
                      <Button
                        key={preset.minutes}
                        type="button"
                        variant={selectedPreset === preset.minutes ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePresetSelect(preset.minutes)}
                        disabled={form.formState.isSubmitting}
                        className="min-h-[44px] min-w-[44px] flex-shrink-0 px-4"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  <FormControl>
                    <Input
                      type="number"
                      min={15}
                      max={2880}
                      step={15}
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(value);
                        // Clear preset selection when manually adjusting duration
                        setSelectedPreset(null);
                      }}
                      disabled={form.formState.isSubmitting}
                      className="min-h-[44px]"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDuration(field.value)}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Add any additional details..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="min-h-[44px]"
              >
                {form.formState.isSubmitting
                  ? isEditMode
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditMode
                  ? 'Update'
                  : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
