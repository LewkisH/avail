import { ProtectedLayout } from '@/components/protected-layout';
import { InvitationAcceptance } from '@/components/invitations/invitation-acceptance';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { token } = await params;

  return (
    <ProtectedLayout>
      <InvitationAcceptance token={token} />
    </ProtectedLayout>
  );
}
