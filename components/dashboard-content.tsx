'use client';

import { useEffect, useState } from 'react';
import { GroupAvailabilityView } from '@/components/groups/group-availability-view';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: Array<{
    id: string;
    userId: string;
  }>;
}

export function DashboardContent() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/groups');
        if (response.ok) {
          const data = await response.json();
          setGroups(data);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Welcome!</h2>
          <p className="text-muted-foreground">
            Manage your groups and discover activities
          </p>
        </div>
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Welcome!</h2>
        <p className="text-muted-foreground">
          Manage your groups and discover activities
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground text-center">
              Join or create a group to see availability suggestions
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <GroupAvailabilityView groupIds={groups.map(g => g.id)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
