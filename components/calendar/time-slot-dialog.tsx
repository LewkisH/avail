'use client';

import { useEffect } from 'react';
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
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

type TimeSlotFormData = z.infer<typeof timeSlotSchema>;

export function TimeSlotDialog({ open, onOpenChange, timeSlot, onSuccess }: TimeSlotDialogProps) {
  const isEditMode = !!timeSlot;

  const form = useForm<TimeSlotFormData>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      title: '',
      startTime: '',
      endTime: '',
      description: '',
    },
  });

  // Reset form when dialog opens/closes or timeSlot changes
  useEffect(() => {
    if (open) {
      if (timeSlot) {
        // Format dates for datetime-local input
        const formatDateTimeLocal = (date: Date) => {
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        form.reset({
          title: timeSlot.title,
          startTime: formatDateTimeLocal(timeSlot.startTime),
          endTime: formatDateTimeLocal(timeSlot.endTime),
          description: timeSlot.description || '',
        });
      } else {
        form.reset({
          title: '',
          startTime: '',
          endTime: '',
          description: '',
        });
      }
    }
  }, [open, timeSlot, form]);

  const onSubmit = async (data: TimeSlotFormData) => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const payload = {
        title: data.title,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
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
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
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
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
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
