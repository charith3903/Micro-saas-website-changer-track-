import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-xl font-bold text-white">WebMonitor</span>
            </div>
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

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-indigo-500/5 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-indigo-300 font-medium">Monitoring 24/7 for you</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-white">Know the moment</span>
            <br />
            <span className="gradient-text">anything changes</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Monitor any website and get instant alerts when content changes — products restock, 
            prices drop, jobs are posted, or competitors update their sites.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-gradient text-lg !px-8 !py-4 w-full sm:w-auto">
              Start Monitoring — It&apos;s Free
            </Link>
            <Link
              href="#features"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 font-medium"
            >
              See how it works
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            No credit card required · 2 free monitors included
          </p>
        </div>
      </section>

      {/* Use Cases */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What will <span className="gradient-text">you</span> monitor?
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              From sneaker restocks to apartment listings — if it&apos;s on the web, we&apos;ll watch it for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "🛍️",
                title: "Product Restocks",
                description: "Get alerted when sold-out items come back in stock. Perfect for sneakers, GPUs, consoles, and limited drops.",
                gradient: "from-pink-500/20 to-rose-500/20",
              },
              {
                icon: "💰",
                title: "Price Drops",
                description: "Track prices across any store. Set a threshold and get notified the second a price drops below it.",
                gradient: "from-emerald-500/20 to-teal-500/20",
              },
              {
                icon: "🏠",
                title: "Apartment Listings",
                description: "Be the first to know when new apartments are listed in your area. Beat the competition to prime rentals.",
                gradient: "from-blue-500/20 to-cyan-500/20",
              },
              {
                icon: "💼",
                title: "Job Postings",
                description: "Monitor career pages for new openings at your dream companies. Apply first, before the rush.",
                gradient: "from-amber-500/20 to-orange-500/20",
              },
              {
                icon: "🔍",
                title: "Competitor Tracking",
                description: "Watch competitor websites for pricing changes, new features, or content updates. Stay one step ahead.",
                gradient: "from-violet-500/20 to-purple-500/20",
              },
              {
                icon: "📰",
                title: "Content Updates",
                description: "Track any page for content changes — government sites, news pages, documentation, or policy updates.",
                gradient: "from-indigo-500/20 to-blue-500/20",
              },
            ].map((useCase) => (
              <div
                key={useCase.title}
                className={`glass-card p-6 hover:scale-[1.02] transition-all duration-300 cursor-default group`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {useCase.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {useCase.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simple as <span className="gradient-text">1-2-3</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Add a URL",
                description: "Paste the webpage you want to monitor. Choose what to watch — the whole page, a specific element, or a keyword.",
              },
              {
                step: "02",
                title: "We watch it",
                description: "Our engine checks the page on your schedule. From every 15 minutes to once a day, depending on your plan.",
              },
              {
                step: "03",
                title: "Get alerted",
                description: "The moment we detect a change, you get an instant alert via email or Telegram. Never miss a beat.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-5xl font-black gradient-text mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-400 text-lg">
              Start free, upgrade when you need more.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-semibold text-slate-300 mb-1">Free</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-400 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  2 monitors
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Check every 24 hours
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Email alerts
                </li>
              </ul>
              <Link href="/signup" className="block w-full text-center py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium">
                Get Started
              </Link>
            </div>

            {/* Basic — recommended */}
            <div className="glass-card p-8 ring-2 ring-indigo-500/50 relative glow-indigo">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Basic</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$3</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  10 monitors
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Check every 1 hour
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Email + Telegram alerts
                </li>
              </ul>
              <Link href="/signup" className="btn-gradient block w-full text-center">
                Start with Basic
              </Link>
            </div>

            {/* Pro */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-semibold text-slate-300 mb-1">Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$5</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-400 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  30 monitors
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Check every 15 minutes
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Email + Telegram + Webhook
                </li>
              </ul>
              <Link href="/signup" className="block w-full text-center py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium">
                Go Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-12 glow-indigo">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to never miss a change?
            </h2>
            <p className="text-slate-400 mb-8">
              Join thousands of users who stay ahead with WebMonitor.
            </p>
            <Link href="/signup" className="btn-gradient text-lg !px-8 !py-4 inline-block">
              Start Monitoring for Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            WebMonitor © {new Date().getFullYear()}
          </div>
          <p className="text-xs text-slate-600">
            Please monitor only pages you are permitted to access. Respect target sites&apos; terms of service.
          </p>
        </div>
      </footer>
    </div>
  );
}
