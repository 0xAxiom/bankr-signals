import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Admin Dashboard - Bankr Signals',
  description: 'Administrative monitoring and analytics for Bankr Signals platform',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simple access control - only allow access if ADMIN_ACCESS is set
  // In production, this would be a more sophisticated auth system
  const adminAccess = process.env.ADMIN_ACCESS === 'true' || 
                     process.env.NODE_ENV === 'development';

  if (!adminAccess) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="bg-[#111] border-b border-[#2a2a2a] px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <a href="/" className="text-green-400 hover:text-green-300 text-sm font-medium">
              ← Back to Site
            </a>
            <div className="w-px h-4 bg-[#2a2a2a]" />
            <h1 className="text-sm font-medium text-white">Administrative Panel</h1>
          </div>
          <div className="text-xs text-gray-500">
            bankrsignals.com/admin
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}