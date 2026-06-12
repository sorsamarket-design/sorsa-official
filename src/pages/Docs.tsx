import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const sections = [
  { id: 'for-brands', label: 'For Brands' },
  { id: 'for-creators', label: 'For Creators' },
  { id: 'how-it-works', label: 'How it Works' },
  { id: 'pricing', label: 'Pricing' }
];

const content = {
  'for-brands': {
    title: 'For Brands',
    body: [
      'SorsaMarket helps brands launch creator campaigns with clear goals, transparent budgets, and escrow-backed reward distribution. Brands can define the campaign brief, target audience, start and end dates, and the actions creators need to complete.',
      'Campaign funds are confirmed before a campaign goes live, which gives creators confidence that approved work can be paid on time. Brand teams can review submissions, approve quality work, and track campaign progress from their dashboard.'
    ]
  },
  'for-creators': {
    title: 'For Creators',
    body: [
      'Creators can discover campaigns from active brands, review requirements before joining, and submit content for approval. Rewards are tied to creator quality, verified activity, and campaign performance.',
      'The platform is designed to reduce cold outreach. Creators browse available opportunities, participate when eligible, and build reputation by completing campaigns successfully.'
    ]
  },
  'how-it-works': {
    title: 'How it Works',
    body: [
      'A brand creates a campaign and confirms funding through escrow. Once the campaign is live, eligible creators can join and submit their content according to the campaign brief.',
      'After submissions are reviewed, approved creators are included in the final payout allocation. The platform then distributes rewards after the campaign period and release delay are complete.'
    ]
  }
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.15, 0.35, 0.6] }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    setMobileOpen(false);
    scrollToSection(id);
  };

  const activeLabel = sections.find((section) => section.id === activeSection)?.label || sections[0].label;

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#171717] font-sans">
      <header className="border-b border-black/10 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <a href="/" className="text-lg font-semibold tracking-tight text-black">
            Sorsa<span className="text-cyan">.market</span>
          </a>
          <a href="/campaigns" className="text-sm font-medium text-[#52525B] hover:text-black transition-colors">
            Sign in
          </a>
        </div>
      </header>

      <div className="lg:hidden sticky top-0 z-30 border-b border-black/10 bg-[#EFEFF3]/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="w-full px-6 py-4 flex items-center justify-between text-sm font-semibold text-black"
        >
          <span>{activeLabel}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>
        {mobileOpen && (
          <nav className="px-3 pb-3">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleNavClick(section.id)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-white text-black border-l-2 border-cyan'
                    : 'text-[#52525B] hover:bg-white/70 hover:text-black'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-[260px_minmax(0,1fr)] gap-12">
        <aside className="hidden lg:block">
          <nav className="sticky top-8 rounded-xl border border-black/10 bg-[#EFEFF3] p-4">
            <p className="px-4 pb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#71717A]">Docs</p>
            <div className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleNavClick(section.id)}
                  className={`w-full text-left px-4 py-3 border-l-2 rounded-r-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'border-cyan bg-white text-black'
                      : 'border-transparent text-[#52525B] hover:border-black/20 hover:bg-white/70 hover:text-black'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <article className="bg-white border border-black/10 rounded-2xl px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan mb-4">SorsaMarket Docs</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black mb-5">Platform Guide</h1>
            <p className="text-lg leading-8 text-[#52525B] mb-14">
              A concise guide for brands and creators using SorsaMarket to launch, join, verify, and reward performance-driven campaigns.
            </p>

            <section id="for-brands" className="scroll-mt-28 border-t border-black/10 pt-10 mb-16">
              <h2 className="text-3xl font-semibold tracking-tight mb-5">{content['for-brands'].title}</h2>
              {content['for-brands'].body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-[#3F3F46] mb-5">
                  {paragraph}
                </p>
              ))}
            </section>

            <section id="for-creators" className="scroll-mt-28 border-t border-black/10 pt-10 mb-16">
              <h2 className="text-3xl font-semibold tracking-tight mb-5">{content['for-creators'].title}</h2>
              {content['for-creators'].body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-[#3F3F46] mb-5">
                  {paragraph}
                </p>
              ))}
            </section>

            <section id="how-it-works" className="scroll-mt-28 border-t border-black/10 pt-10 mb-16">
              <h2 className="text-3xl font-semibold tracking-tight mb-5">{content['how-it-works'].title}</h2>
              {content['how-it-works'].body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-[#3F3F46] mb-5">
                  {paragraph}
                </p>
              ))}
            </section>

            <section id="pricing" className="scroll-mt-28 border-t border-black/10 pt-10">
              <h2 className="text-3xl font-semibold tracking-tight mb-5">Pricing</h2>
              <p className="text-base leading-8 text-[#3F3F46] mb-8">
                Pricing is automatically determined by each creator's Sorsa Score. The higher the score, the greater the campaign reward rate. Brands don't set prices manually — the protocol handles it based on verified onchain activity and creator performance.
              </p>

              <div className="space-y-5">
                {[
                  { label: 'Low', width: '38%', color: 'bg-cyan/50' },
                  { label: 'Mid', width: '66%', color: 'bg-cyan/75' },
                  { label: 'High', width: '92%', color: 'bg-cyan' }
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-black">{bar.label}</span>
                      <span className="text-xs text-[#71717A]">Sorsa Score</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#E4E4E7] overflow-hidden">
                      <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
