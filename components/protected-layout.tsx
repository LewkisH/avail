import { UserButton } from "./user-button";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Avail</h1>
            <nav className="flex gap-4">
              <a
                href="/dashboard"
                className="text-sm font-medium hover:underline"
              >
                Dashboard
              </a>
              <a href="/groups" className="text-sm font-medium hover:underline">
                Groups
              </a>
              <a
                href="/calendar"
                className="text-sm font-medium hover:underline"
              >
                Calendar
              </a>
              <a
                href="/profile"
                className="text-sm font-medium hover:underline"
              >
                Profile
              </a>
            </nav>
          </div>
          <UserButton />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
