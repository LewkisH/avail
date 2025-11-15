import { ProtectedLayout } from "@/components/protected-layout";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <ProtectedLayout>
      <CalendarView />
    </ProtectedLayout>
  );
}
