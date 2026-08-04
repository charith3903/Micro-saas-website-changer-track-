import Link from 'next/link';
import { PLANS } from '@/lib/plans';

interface PricingTableProps {
  /** Plan key to visually highlight as "Most Popular". */
  highlight?: string;
  /** Where each plan's CTA button links to. */
  ctaHref?: (planKey: string) => string;
  ctaLabel?: (planKey: string) => string;
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email alerts',
  telegram: 'Telegram alerts',
  webhook: 'Webhook alerts',
};

function formatInterval(seconds: number): string {
  if (seconds < 3600) return `Every ${Math.round(seconds / 60)} min`;
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return `Every ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.round(seconds / 86400);
  return `Every ${days * 24} hours`;
}

export default function PricingTable({
  highlight = 'basic',
  ctaHref = () => '/signup',
  ctaLabel = () => 'Get Started',
}: PricingTableProps) {
  const planEntries = Object.entries(PLANS);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {planEntries.map(([key, plan]) => {
        const isHighlighted = key === highlight;
        return (
          <div
            key={key}
            className={`glass-card p-8 relative ${
              isHighlighted ? 'ring-2 ring-indigo-500/50 glow-indigo' : ''
            }`}
          >
            {isHighlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                Most Popular
              </div>
            )}

            <h3 className={`text-lg font-semibold mb-1 ${isHighlighted ? 'text-white' : 'text-slate-300'}`}>
              {plan.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-white">${plan.price}</span>
              <span className="text-slate-500">/month</span>
            </div>

            <ul className={`space-y-3 text-sm mb-8 ${isHighlighted ? 'text-slate-300' : 'text-slate-400'}`}>
              <li className="flex items-center gap-2">
                <CheckIcon />
                {plan.maxMonitors} monitor{plan.maxMonitors !== 1 ? 's' : ''}
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                Checks as often as {formatInterval(plan.minIntervalSeconds).toLowerCase()}
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                All 5 monitor types (full page, CSS selector, keyword, price drop)
              </li>
              {plan.channels.map((channel) => (
                <li key={channel} className="flex items-center gap-2">
                  <CheckIcon />
                  {CHANNEL_LABELS[channel]}
                </li>
              ))}
            </ul>

            <Link
              href={ctaHref(key)}
              className={
                isHighlighted
                  ? 'btn-gradient block w-full text-center'
                  : 'block w-full text-center py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium'
              }
            >
              {ctaLabel(key)}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
