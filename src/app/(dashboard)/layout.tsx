import Sidebar from '@/components/shared/Sidebar';
import Topbar from '@/components/shared/Topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFB] text-slate-800 relative">
      {/* Background grid pattern */}
      <div className="bg-grid-pattern fixed inset-0 pointer-events-none z-0" />

      <Sidebar />
      <div className="main-content flex flex-col min-h-screen relative z-10">
        <Topbar />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 w-full max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
