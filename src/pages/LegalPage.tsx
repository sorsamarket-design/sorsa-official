import React from 'react';

type LegalPageProps = {
  type: 'terms' | 'privacy' | 'cookies';
};

const updated = 'June 10, 2026';

const pages = {
  terms: {
    title: 'Terms of Service',
    intro:
      'These Terms govern your access to and use of SorsaMarket, including creator campaigns, brand dashboards, escrow-backed rewards, and related services.',
    sections: [
      {
        title: '1. Eligibility',
        body:
          'You must be able to form a binding agreement and comply with applicable laws to use SorsaMarket. If you use the platform for a company or brand, you confirm that you are authorized to act on its behalf.'
      },
      {
        title: '2. Accounts and Wallets',
        body:
          'You are responsible for maintaining access to your account, wallet, and authentication methods. Wallet transactions are irreversible, and you are responsible for reviewing network, wallet, and transaction details before confirming.'
      },
      {
        title: '3. Campaigns and Creator Submissions',
        body:
          'Brands are responsible for providing accurate campaign briefs, budgets, and requirements. Creators are responsible for submitting original, compliant content that follows each campaign brief and applicable platform rules.'
      },
      {
        title: '4. Rewards and Escrow',
        body:
          'Campaign rewards may be funded through escrow before a campaign goes live. Approved rewards are distributed according to campaign rules, verification outcomes, and platform payout processes. Blockchain fees, delays, failed transactions, or network issues may affect timing.'
      },
      {
        title: '5. Prohibited Conduct',
        body:
          'You may not use SorsaMarket to submit fraudulent activity, manipulate engagement, impersonate others, violate intellectual property rights, distribute harmful content, or attempt to interfere with platform security.'
      },
      {
        title: '6. Disclaimers',
        body:
          'SorsaMarket is provided on an as-is and as-available basis. We do not guarantee uninterrupted access, campaign availability, creator performance, earnings, or specific business outcomes.'
      },
      {
        title: '7. Changes',
        body:
          'We may update these Terms as the platform evolves. Continued use of SorsaMarket after updates means you accept the revised Terms.'
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This Privacy Policy explains how SorsaMarket collects, uses, and protects information when you use our website, dashboards, campaign tools, and related services.',
    sections: [
      {
        title: '1. Information We Collect',
        body:
          'We may collect account details, contact information, profile data, campaign activity, creator submissions, wallet addresses, authentication data, support messages, and technical information such as device, browser, and usage data.'
      },
      {
        title: '2. How We Use Information',
        body:
          'We use information to operate accounts, run campaigns, verify creator participation, calculate rewards, support escrow workflows, provide customer support, improve the product, prevent abuse, and comply with legal obligations.'
      },
      {
        title: '3. Wallet and Onchain Data',
        body:
          'Wallet addresses and blockchain transactions may be public by nature. Information recorded on public networks may remain visible independently of SorsaMarket.'
      },
      {
        title: '4. Service Providers',
        body:
          'We may use trusted service providers for authentication, database hosting, analytics, notifications, wallet connectivity, campaign verification, and infrastructure. These providers process information only as needed to support the platform.'
      },
      {
        title: '5. Data Retention',
        body:
          'We keep information for as long as needed to provide the service, maintain records, resolve disputes, enforce agreements, prevent fraud, and meet legal or operational requirements.'
      },
      {
        title: '6. Your Choices',
        body:
          'You may update account information, manage notification preferences, disconnect integrations where available, or contact us about privacy requests. Some information may be retained where required for security, legal, or transactional reasons.'
      },
      {
        title: '7. Security',
        body:
          'We use reasonable technical and organizational safeguards, but no internet or blockchain-connected service can be guaranteed to be completely secure.'
      }
    ]
  },
  cookies: {
    title: 'Cookie Policy',
    intro:
      'This Cookie Policy explains how SorsaMarket may use cookies and similar technologies to keep the site working, improve performance, and support product analytics.',
    sections: [
      {
        title: '1. What Cookies Are',
        body:
          'Cookies are small files stored on your device. Similar technologies may include local storage, pixels, device identifiers, and session storage.'
      },
      {
        title: '2. Essential Cookies',
        body:
          'Essential cookies and storage help the website function, keep sessions active, remember authentication state, protect against abuse, and support core product flows.'
      },
      {
        title: '3. Analytics and Performance',
        body:
          'We may use analytics tools to understand how visitors use SorsaMarket, identify errors, measure performance, and improve pages and workflows.'
      },
      {
        title: '4. Preferences',
        body:
          'Preference storage may remember settings such as interface choices, notification preferences, wallet connection state, or other product options.'
      },
      {
        title: '5. Managing Cookies',
        body:
          'You can control cookies through your browser settings. Blocking some cookies may affect login, wallet connection, campaign tools, or other platform features.'
      }
    ]
  }
};

export default function LegalPage({ type }: LegalPageProps) {
  const page = pages[type];

  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#171717] font-sans">
      <header className="border-b border-black/10 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <a href="/" className="text-lg font-semibold tracking-tight text-black">
            Sorsa<span className="text-cyan">.market</span>
          </a>
          <a href="/docs" className="text-sm font-medium text-[#52525B] hover:text-black transition-colors">
            Docs
          </a>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <div className="bg-white border border-black/10 rounded-2xl p-6 sm:p-10 md:p-14">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan mb-4">Legal</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black mb-4">{page.title}</h1>
          <p className="text-sm text-[#71717A] mb-8">Last updated: {updated}</p>
          <p className="text-lg leading-8 text-[#3F3F46] mb-12">{page.intro}</p>

          <div className="space-y-10">
            {page.sections.map((section) => (
              <section key={section.title} className="border-t border-black/10 pt-8">
                <h2 className="text-xl font-semibold text-black mb-3">{section.title}</h2>
                <p className="text-base leading-8 text-[#3F3F46]">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-xl bg-[#EFEFF3] border border-black/10 p-5 text-sm leading-6 text-[#52525B]">
            This page is a general platform policy draft and may need review by qualified legal counsel before production use.
          </div>
        </div>
      </article>
    </main>
  );
}
