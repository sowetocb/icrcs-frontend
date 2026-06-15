import CitizenSidebar from "@/components/layout/citizenSidebar";
import DashboardTopbar from "@/components/layout/dashboardTopbar";
import AuthGuard from "@/components/auth/authGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-surface">
        <DashboardTopbar />
        <div className="flex flex-1">
          <CitizenSidebar />
          <main className="flex-1 overflow-x-hidden px-6 py-8 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
