import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Bug, ChevronDown, ChevronUp, Send } from 'lucide-react';
import CreatorSidebar from '../components/CreatorSidebar';
import CreatorTopBar from '../components/CreatorTopBar';
import { TelegramLogo } from '../components/TelegramLogo';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const appleEase = [0.16, 1, 0.3, 1] as const;

const faqs = [
  {
    question: "How do I get paid for a campaign?",
    answer: "Once your submissions gets approved, The rewards would automatically sent to your connected wallet 24hrs after campaign ends."
  },
  {
    question: "How is my Sorsa Score calculated?",
    answer: "Sorsa score is a measures of the strength of your influence by analyzing who follows you and not just how many, but how impactful they are. It prioritizes high-value connections across leading crypto voices, projects, and VC networks, where quality outweighs quantity."
  },
  {
    question: "What happens if my submission is rejected?",
    answer: "if a submission is rejected, you'll receive specific feedback on what needs to be changed. You can then update your post and resubmit. If it's completely rejected without a chance for revision, you can dispute the decision through our support team."
  },
  {
    question: "Can I participate in multiple campaigns at once?",
    answer: "Yes! You can join as many campaigns as you have capacity for, provided you meet the tier and category requirements for each."
  },
  {
    question: "How do I upgrade my Creator Tier?",
    answer: "Creator tiers are automatically updated based on the Sorsa score"
  }
];

export default function Contact() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [issueType, setIssueType] = useState('bug');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) {
      setSubmitError('Unable to submit report.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const { error } = await supabase.from('support_tickets').insert({
        creator_id: user.id,
        issue_type: issueType,
        description: description.trim(),
        status: 'open'
      });
      if (error) throw error;
      setIsSubmitting(false);
      setDescription('');
      setIssueType('bug');
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      setSubmitError('Unable to submit report.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-cyan/30 flex">
      <CreatorSidebar />
      <main className="creator-page-main flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-3xl font-semibold tracking-tight text-white"
              >
                Contact SorsaMarket Support
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
                className="text-muted mt-2"
              >
                Need help? We're here for you. Choose how you'd like to reach us or check the FAQs below.
              </motion.p>
            </div>
            <CreatorTopBar embedded />
          </div>

          {/* Contact Options */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="grid grid-cols-3 gap-2.5 md:gap-6"
          >
            <a 
              href="https://t.me/SorsaMarket" 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:bg-white/5 transition-all group flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TelegramLogo className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Telegram</h3>
              <p className="text-sm text-muted">Fastest response time</p>
            </a>

            <a 
              href="https://x.com/sorsamarket" 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:bg-white/5 transition-all group flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-1">X / Twitter</h3>
              <p className="text-sm text-muted">DM us @sorsamarket</p>
            </a>

            <a 
              href="mailto:contact@sorsamarket.com"
              className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-cyan/50 hover:bg-white/5 transition-all group flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-cyan/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-cyan" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Email</h3>
              <p className="text-sm text-muted">contact@sorsamarket.com</p>
            </a>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* FAQs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.3 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-semibold text-white">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div 
                    key={index}
                    className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="font-medium text-white">{faq.question}</span>
                      {openFaq === index ? (
                        <ChevronUp className="w-4 h-4 text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted shrink-0" />
                      )}
                    </button>
                    <AnimatePresence>
                      {openFaq === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: appleEase }}
                        >
                          <div className="px-6 pb-4 text-sm text-muted leading-relaxed">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Report Bug Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: appleEase, delay: 0.4 }}
            >
              <div className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 blur-[80px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Bug className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Report an Issue</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-2">Issue Type</label>
                      <select 
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                      >
                        <option value="bug" className="bg-[#0A0A1E]">Bug / Glitch</option>
                        <option value="payment" className="bg-[#0A0A1E]">Payment Issue</option>
                        <option value="campaign" className="bg-[#0A0A1E]">Campaign Dispute</option>
                        <option value="other" className="bg-[#0A0A1E]">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted mb-2">Description</label>
                      <textarea 
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please describe the issue in detail..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan/50 transition-colors resize-none h-32"
                      />
                    </div>

                    {submitError && <p className="text-sm text-red-400">{submitError}</p>}
                    {submitSuccess && <p className="text-sm text-green-400">Report submitted.</p>}

                    <button 
                      type="submit"
                      disabled={isSubmitting || !description.trim()}
                      className="w-full py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-white"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'} <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
}
