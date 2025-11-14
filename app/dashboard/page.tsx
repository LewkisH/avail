import { ProtectedLayout } from "@/components/protected-layout";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Welcome!</h2>
          <p className="text-muted-foreground">
            Manage your groups and discover activities
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-semibold">Your Groups</h3>
            <p className="text-sm text-muted-foreground">
              View and manage your activity groups
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-semibold">Calendar</h3>
            <p className="text-sm text-muted-foreground">
              Sync your calendar and view availability
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-semibold">Suggestions</h3>
            <p className="text-sm text-muted-foreground">
              Get AI-powered activity recommendations
            </p>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
