'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeInput } from '@/components/ui/time-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { getUserTimezone } from '@/lib/utils/timezone';

// Form validation schemas
const interestsSchema = z.object({
  interests: z.array(z.string()).min(0).max(50),
});

const budgetSchema = z.object({
  minBudget: z.number().min(0),
  maxBudget: z.number().min(0),
  currency: z.string().length(3),
}).refine((data) => data.maxBudget >= data.minBudget, {
  message: 'Maximum budget must be greater than or equal to minimum budget',
});

const sleepTimeSchema = z.object({
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
});

type InterestsFormData = z.infer<typeof interestsSchema>;
type BudgetFormData = z.infer<typeof budgetSchema>;
type SleepTimeFormData = z.infer<typeof sleepTimeSchema>;

interface UserProfile {
  id: string;
  email: string;
  name: string;
  interests: string[];
  budget: {
    min: number;
    max: number;
    currency: string;
  } | null;
  sleepTime: {
    startTime: string;
    endTime: string;
  } | null;
}

export function ProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingSleepTime, setSavingSleepTime] = useState(false);

  const budgetForm = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      minBudget: 0,
      maxBudget: 100,
      currency: 'EUR',
    },
  });

  const sleepTimeForm = useForm<SleepTimeFormData>({
    resolver: zodResolver(sleepTimeSchema),
    defaultValues: {
      startTime: '22:00',
      endTime: '08:00',
    },
  });

  // Fetch user profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfile(data);
      setInterests(data.interests || []);
      
      if (data.budget) {
        budgetForm.reset({
          minBudget: data.budget.min,
          maxBudget: data.budget.max,
          currency: data.budget.currency,
        });
      }

      if (data.sleepTime) {
        // Convert UTC times to local time for display
        const convertUtcToLocal = (utcTime: string) => {
          const [hours, minutes] = utcTime.split(':').map(Number);
          const date = new Date();
          date.setUTCHours(hours, minutes, 0, 0);
          const localHours = date.getHours().toString().padStart(2, '0');
          const localMinutes = date.getMinutes().toString().padStart(2, '0');
          return `${localHours}:${localMinutes}`;
        };

        sleepTimeForm.reset({
          startTime: convertUtcToLocal(data.sleepTime.startTime),
          endTime: convertUtcToLocal(data.sleepTime.endTime),
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 50) {
      setInterests([...interests, trimmed]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const handleSaveInterests = async () => {
    setSavingInterests(true);
    try {
      const response = await fetch('/api/user/interests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update interests');
      }

      const data = await response.json();
      setProfile(data);
      toast.success('Interests updated successfully');
    } catch (error) {
      console.error('Error updating interests:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update interests');
    } finally {
      setSavingInterests(false);
    }
  };

  const handleSaveBudget = async (data: BudgetFormData) => {
    setSavingBudget(true);
    try {
      const response = await fetch('/api/user/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update budget');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      toast.success('Budget updated successfully');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update budget');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleSaveSleepTime = async (data: SleepTimeFormData) => {
    setSavingSleepTime(true);
    try {
      // Convert local time to UTC for storage
      const convertLocalToUtc = (localTime: string) => {
        const [hours, minutes] = localTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        const utcHours = date.getUTCHours().toString().padStart(2, '0');
        const utcMinutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${utcHours}:${utcMinutes}`;
      };

      const payload = {
        startTime: convertLocalToUtc(data.startTime),
        endTime: convertLocalToUtc(data.endTime),
        timezone: getUserTimezone(),
      };

      const response = await fetch('/api/user/sleep-time', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update sleep time');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      
      // Convert UTC times back to local for the form display
      if (updatedProfile.sleepTime) {
        const convertUtcToLocal = (utcTime: string) => {
          const [hours, minutes] = utcTime.split(':').map(Number);
          const date = new Date();
          date.setUTCHours(hours, minutes, 0, 0);
          const localHours = date.getHours().toString().padStart(2, '0');
          const localMinutes = date.getMinutes().toString().padStart(2, '0');
          return `${localHours}:${localMinutes}`;
        };

        sleepTimeForm.setValue('startTime', convertUtcToLocal(updatedProfile.sleepTime.startTime));
        sleepTimeForm.setValue('endTime', convertUtcToLocal(updatedProfile.sleepTime.endTime));
      }
      
      toast.success('Sleep time updated successfully');
    } catch (error) {
      console.error('Error updating sleep time:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update sleep time');
    } finally {
      setSavingSleepTime(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Interests Card */}
      <Card>
        <CardHeader>
          <CardTitle>Interests</CardTitle>
          <CardDescription>
            Add your interests to get better activity suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="interest-input">Add Interest</Label>
            <div className="flex gap-2">
              <Input
                id="interest-input"
                placeholder="e.g., hiking, music, dining"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
                maxLength={100}
              />
              <Button
                type="button"
                onClick={handleAddInterest}
                disabled={!interestInput.trim() || interests.length >= 50}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {interests.length} / 50 interests
            </p>
          </div>

          <div className="space-y-2">
            <Label>Your Interests</Label>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-md">
              {interests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No interests added yet
                </p>
              ) : (
                interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="gap-1">
                    {interest}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <Button
            onClick={handleSaveInterests}
            disabled={savingInterests}
            className="w-full"
          >
            {savingInterests ? "Saving..." : "Save Interests"}
          </Button>
        </CardContent>
      </Card>

      {/* Budget Card */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Range</CardTitle>
          <CardDescription>
            Set your budget preferences for activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={budgetForm.handleSubmit(handleSaveBudget)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="minBudget">Minimum Budget</Label>
              <Input
                id="minBudget"
                type="number"
                min="0"
                step="0.01"
                {...budgetForm.register("minBudget", { valueAsNumber: true })}
              />
              {budgetForm.formState.errors.minBudget && (
                <p className="text-sm text-destructive">
                  {budgetForm.formState.errors.minBudget.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxBudget">Maximum Budget</Label>
              <Input
                id="maxBudget"
                type="number"
                min="0"
                step="0.01"
                {...budgetForm.register("maxBudget", { valueAsNumber: true })}
              />
              {budgetForm.formState.errors.maxBudget && (
                <p className="text-sm text-destructive">
                  {budgetForm.formState.errors.maxBudget.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={budgetForm.watch("currency")}
                onValueChange={(value) =>
                  budgetForm.setValue("currency", value)
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CHF">CHF (Fr)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={savingBudget} className="w-full">
              {savingBudget ? "Saving..." : "Save Budget"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sleep Time Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sleep Time</CardTitle>
          <CardDescription>
            Set your typical sleep hours to avoid scheduling during rest time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={sleepTimeForm.handleSubmit(handleSaveSleepTime)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="startTime">Sleep Start Time</Label>
              <Controller
                name="startTime"
                control={sleepTimeForm.control}
                render={({ field }) => <TimeInput id="startTime" {...field} />}
              />
              {sleepTimeForm.formState.errors.startTime && (
                <p className="text-sm text-destructive">
                  {sleepTimeForm.formState.errors.startTime.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Wake Up Time</Label>
              <Controller
                name="endTime"
                control={sleepTimeForm.control}
                render={({ field }) => <TimeInput id="endTime" {...field} />}
              />
              {sleepTimeForm.formState.errors.endTime && (
                <p className="text-sm text-destructive">
                  {sleepTimeForm.formState.errors.endTime.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={savingSleepTime} className="w-full">
              {savingSleepTime ? "Saving..." : "Save Sleep Time"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
