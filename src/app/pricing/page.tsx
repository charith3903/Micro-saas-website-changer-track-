import Link from 'next/link';
import PricingTable from '@/components/PricingTable';

export const metadata = {
  title: 'Pricing — WebMonitor',
  description: 'Simple, transparent pricing for website change monitoring. Start free, upgrade when you need more.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="w-full border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">WebMonitor</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-slate-300 hover:text-white transition-colors font-medium">
                Log in
              </Link>
              <Link href="/signup" className="btn-gradient text-sm !px-5 !py-2.5">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Simple, <span className="gradient-text">transparent</span> pricing
            </h1>
            <p className="text-slate-400 text-lg">
              Start free, upgrade when you need more monitors or faster checks.
            </p>
          </div>

          <PricingTable
            ctaHref={(plan) => (plan === 'free' ? '/signup' : `/signup?plan=${plan}`)}
            ctaLabel={(plan) => (plan === 'free' ? 'Get Started' : `Start with ${plan[0].toUpperCase()}${plan.slice(1)}`)}
          />

          <p className="text-center text-sm text-slate-500 mt-10">
            All plans include full-page, CSS-selector, keyword, and price-drop monitoring.
            No credit card required to start — plan changes are instant from your account settings.
          </p>
        </div>
      </section>
    </div>
  );
}
