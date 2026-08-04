'use client';

import { useState } from 'react';

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'How does change detection actually work?',
    answer:
      "We fetch your page on your chosen schedule and extract just the part you asked us to watch — the whole page, one CSS-selected element, a keyword, or a price. Then we compare it to the last snapshot. If it's different, you get notified.",
  },
  {
    question: 'Will I get false alerts from ads or unrelated page changes?',
    answer:
      'Full-page monitoring strips scripts, navigation, headers, and footers before comparing, so most rotating ads and layout noise are filtered out automatically. For pinpoint accuracy, use a CSS-selector, keyword, or price-drop monitor instead of watching the whole page.',
  },
  {
    question: 'Is my data private?',
    answer:
      "Passwords are hashed with bcrypt and never stored in plain text. We only fetch the public pages you configure — we never ask for or store login credentials to third-party sites.",
  },
  {
    question: 'Can I change or cancel my plan anytime?',
    answer:
      "Yes — switch plans instantly from Account Settings. If you're over the new plan's monitor limit, we'll tell you exactly how many to remove before downgrading, instead of silently breaking things.",
  },
  {
    question: 'What happens if a monitor keeps failing?',
    answer:
      "After 3 consecutive failed checks, the monitor is automatically paused and you get a one-time alert — so a broken selector or a site outage doesn't spam your inbox.",
  },
  {
    question: 'Can I monitor any website?',
    answer:
      'Only monitor pages you are permitted to access, and respect target sites’ terms of service. As a safety measure, we block requests to private/internal IP addresses and localhost.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-700/20 transition-colors"
      >
        <span className="text-sm font-medium text-white">{question}</span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function Faq() {
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {FAQS.map((faq) => (
        <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
      ))}
    </div>
  );
}
