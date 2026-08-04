'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { UserContext, type DashboardUser } from '@/lib/user-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else router.push('/login');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" role="status" aria-label="Loading" />
    </div>
  );

  if (!user) return null;

  return (
    <UserContext.Provider value={user}>
      <ToastProvider>
        <div className="min-h-screen bg-slate-900 relative">
          {/* Ambient background depth, matches landing page treatment */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -right-24 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
          </div>

          <Navbar userEmail={user.email} plan={user.plan} onLogout={handleLogout} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
            {children}
          </main>
        </div>
      </ToastProvider>
    </UserContext.Provider>
  );
}
