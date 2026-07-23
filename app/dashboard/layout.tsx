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
      <div className="flex min-h-screen flex-col overflow-x-clip bg-surface">
        <DashboardTopbar />
        <div className="flex flex-1">
          <CitizenSidebar />
          <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
            <div className="mx-auto w-full min-w-0 max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
