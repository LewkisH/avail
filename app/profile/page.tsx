import { ProtectedLayout } from '@/components/protected-layout';
import { ProfileForm } from '@/components/profile-form';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Profile Settings</h2>
          <p className="text-muted-foreground">
            Manage your interests and budget preferences
          </p>
        </div>

        <ProfileForm />
      </div>
    </ProtectedLayout>
  );
}
