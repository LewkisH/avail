import { ProtectedLayout } from '@/components/protected-layout';
import { GroupsList } from '@/components/groups/groups-list';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function GroupsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <ProtectedLayout>
      <GroupsList />
    </ProtectedLayout>
  );
}
