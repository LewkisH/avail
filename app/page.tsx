import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex max-w-3xl flex-col items-center gap-8 px-8 py-16 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Group Activity Planner
          </h1>
          <p className="text-xl text-muted-foreground">
            Plan activities with friends based on shared interests and
            availability
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="flex h-12 items-center justify-center rounded-lg border px-8 transition-colors hover:bg-accent"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Create Groups</h3>
            <p className="text-sm text-muted-foreground">
              Form groups with friends and share your interests
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Sync Calendars</h3>
            <p className="text-sm text-muted-foreground">
              Import your calendar to find common availability
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Get Suggestions</h3>
            <p className="text-sm text-muted-foreground">
              Receive AI-powered activity recommendations
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
