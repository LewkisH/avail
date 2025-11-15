'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    timezone: 'UTC',
    location: '',
    cost: '',
    currency: 'EUR',
    category: '',
    sourceApi: 'manual',
    sourceId: '',
    sourceUrl: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        toast.success('Authenticated successfully');
      } else {
        toast.error('Invalid password');
      }
    } catch (error) {
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJsonImport = async () => {
    setLoading(true);
    try {
      let events;
      try {
        events = JSON.parse(jsonInput);
      } catch (parseError) {
        toast.error('Invalid JSON format');
        setLoading(false);
        return;
      }

      const eventsArray = Array.isArray(events) ? events : [events];

      // Validate each event has required fields
      for (let i = 0; i < eventsArray.length; i++) {
        const event = eventsArray[i];
        const missing: string[] = [];

        if (!event.title) missing.push('title');
        if (!event.description) missing.push('description');
        if (!event.startTime) missing.push('startTime');
        if (!event.endTime) missing.push('endTime');
        if (!event.timezone) missing.push('timezone');
        if (!event.category) missing.push('category');
        if (!event.sourceApi) missing.push('sourceApi');
        if (!event.sourceId) missing.push('sourceId');
        if (!event.sourceUrl) missing.push('sourceUrl');

        if (missing.length > 0) {
          toast.error(`Event ${i + 1}: Missing required fields: ${missing.join(', ')}`);
          setLoading(false);
          return;
        }

        // Validate datetime format
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);

        if (isNaN(startDate.getTime())) {
          toast.error(`Event ${i + 1}: Invalid startTime format`);
          setLoading(false);
          return;
        }

        if (isNaN(endDate.getTime())) {
          toast.error(`Event ${i + 1}: Invalid endTime format`);
          setLoading(false);
          return;
        }

        if (endDate <= startDate) {
          toast.error(`Event ${i + 1}: endTime must be after startTime`);
          setLoading(false);
          return;
        }

        // Validate timezone
        try {
          Intl.DateTimeFormat(undefined, { timeZone: event.timezone });
        } catch {
          toast.error(`Event ${i + 1}: Invalid timezone "${event.timezone}"`);
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, events: eventsArray }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to import events');
      }

      const result = await response.json();
      toast.success(`Imported ${result.count} event(s)`);
      setJsonInput('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import events');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const event = {
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      };

      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, events: [event] }),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      toast.success('Event created successfully');
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        timezone: 'UTC',
        location: '',
        cost: '',
        currency: 'EUR',
        category: '',
        sourceApi: 'manual',
        sourceId: '',
        sourceUrl: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Enter password to manage external events</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Authenticating...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">External Events Admin</h1>
          <p className="text-muted-foreground">Manage external events via JSON import or form</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* JSON Import */}
          <Card>
            <CardHeader>
              <CardTitle>JSON Import</CardTitle>
              <CardDescription>Import one or multiple events from JSON</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="json">JSON Data</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const exampleJson = {
                        title: "Event Name",
                        description: "Description",
                        startTime: "2026-01-15T10:00:00Z",
                        endTime: "2026-01-15T12:00:00Z",
                        timezone: "UTC",
                        location: "Location",
                        cost: 25.00,
                        currency: "EUR",
                        category: "concert",
                        sourceApi: "manual",
                        sourceId: "unique-id",
                        sourceUrl: "https://example.com"
                      };
                      setJsonInput(JSON.stringify(exampleJson, null, 2));
                      toast.success('Example JSON copied to input');
                    }}
                  >
                    Copy Example JSON
                  </Button>
                </div>
                <textarea
                  id="json"
                  className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{
  "title": "Event Name",
  "description": "Description",
  "startTime": "2026-01-15T10:00:00Z",
  "endTime": "2026-01-15T12:00:00Z",
  "timezone": "UTC",
  "location": "Location",
  "cost": 25.00,
  "currency": "EUR",
  "category": "concert",
  "sourceApi": "manual",
  "sourceId": "unique-id",
  "sourceUrl": "https://example.com"
}`}
                />
              </div>
              <Button onClick={handleJsonImport} disabled={loading || !jsonInput}>
                {loading ? 'Importing...' : 'Import Events'}
              </Button>
            </CardContent>
          </Card>

          {/* Form Input */}
          <Card>
            <CardHeader>
              <CardTitle>Create Event</CardTitle>
              <CardDescription>Add a single event via form</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-20 p-2 border rounded-md text-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="concert, sports, etc."
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="sourceId">Source ID *</Label>
                  <Input
                    id="sourceId"
                    value={formData.sourceId}
                    onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                    placeholder="unique-event-id"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                    placeholder="https://example.com/event"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
