import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useDisconnect } from 'wagmi';
import {
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  Wallet,
  Megaphone,
  Search,
  Star,
  Instagram,
  Linkedin,
  Menu,
  X,
  Target,
  ArrowRight
} from 'lucide-react';
import { XLogo } from '../components/XLogo';
import { useAuth } from '../context/AuthContext';

const appleEase = [0.16, 1, 0.3, 1];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let frame = 0;

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 20);
        frame = 0;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: appleEase }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex justify-center ${isScrolled ? 'py-4 px-4' : 'py-6 px-6'}`}
    >
      <div className={`transition-all duration-500 w-full max-w-7xl mx-auto flex items-center justify-between ${isScrolled ? 'bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full py-3 px-6' : 'bg-transparent'}`}>
        <a href="#top" aria-label="Back to top" className="-my-1.5 flex min-h-11 items-center gap-3 py-1.5 text-xl font-semibold tracking-tight text-white">
          <img src="/SorsaMarketlogo.PNG" alt="Logo" className="w-8 h-8 object-contain" />
          <div>Sorsa<span className="text-cyan">.market</span></div>
        </a>

        <div className="hidden md:flex items-center space-x-8">
          <a href="#how-it-works" className="text-sm font-medium text-muted hover:text-white transition-colors">How It Works</a>
          <a href="#for-brands" className="text-sm font-medium text-muted hover:text-white transition-colors">For Brands</a>
          <a href="#for-creators" className="text-sm font-medium text-muted hover:text-white transition-colors">For Creators</a>
          <a href="#faq" className="text-sm font-medium text-muted hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="hidden md:block">
          <button onClick={() => navigate('/campaigns')} className="px-5 py-2 rounded-full bg-white text-black font-medium text-sm hover:scale-105 transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
            Sign in
          </button>
        </div>

        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          className="-m-2.5 flex min-h-11 min-w-11 items-center justify-center p-2.5 text-white md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#050505]/95 backdrop-blur-3xl border-b border-white/10 p-6 flex flex-col space-y-4 mt-2 rounded-b-3xl">
          <a href="#how-it-works" className="text-white font-medium" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#for-brands" className="text-white font-medium" onClick={() => setMobileMenuOpen(false)}>For Brands</a>
          <a href="#for-creators" className="text-white font-medium" onClick={() => setMobileMenuOpen(false)}>For Creators</a>
          <a href="#faq" className="text-white font-medium" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <button onClick={() => { setMobileMenuOpen(false); navigate('/campaigns'); }} className="px-6 py-3 text-center rounded-full bg-white text-black font-medium text-sm mt-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
            Sign in
          </button>
        </div>
      )}
    </motion.nav>
  );
};

const Hero = () => {
  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, { stiffness: 90, damping: 24, mass: 0.35 });
  const y1 = useTransform(smoothScrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(smoothScrollY, [0, 1000], [0, -100]);
  const opacity = useTransform(smoothScrollY, [0, 500], [1, 0]);
  const glowOpacity = useTransform(smoothScrollY, [0, 500], [0.5, 0]);
  const scale = useTransform(smoothScrollY, [0, 500], [1, 0.95]);
  const navigate = useNavigate();
  const { session, role, signOut } = useAuth();
  const { disconnect } = useDisconnect();

  const handleRoleEntry = async (targetRole: 'brand' | 'creator') => {
    if (targetRole === 'brand' && session) {
      navigate('/brand/profiles');
      return;
    }

    if (role === targetRole) {
      navigate(targetRole === 'brand' ? '/brand/campaigns' : '/creator/campaigns');
      return;
    }

    if (session) {
      disconnect();
      await signOut();
    }

    navigate(targetRole === 'brand' ? '/auth/brand' : '/auth/creator');
  };

  return (
    <section id="top" className="relative min-h-[100svh] flex items-center pt-24 pb-8 md:pt-28 md:pb-10 overflow-hidden">
      {/* Subtle Apple-style Ambient Glow */}
      <motion.div style={{ y: y1, opacity: glowOpacity, willChange: "transform, opacity" }} className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] md:w-[800px] h-[200px] md:h-[400px] bg-cyan/20 blur-[80px] md:blur-[120px] rounded-full pointer-events-none"></motion.div>
      <motion.div style={{ y: y2, opacity: glowOpacity, willChange: "transform, opacity" }} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[150px] md:h-[300px] bg-purple/20 blur-[80px] md:blur-[120px] rounded-full pointer-events-none"></motion.div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-8 lg:gap-10 items-center z-10 w-full">
        <motion.div
          style={{ y: y1, opacity, scale, willChange: "transform, opacity" }}
          className="flex flex-col items-start"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: appleEase, delay: 0.1 }}
            className="mt-11 text-4xl md:text-5xl lg:text-[3.4rem] xl:text-6xl font-semibold tracking-tighter leading-[1.03] mb-4 text-gradient"
          >
            Where Brands <br/> Meet Creators.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: appleEase, delay: 0.2 }}
            className="text-sm md:text-base lg:text-[1.05rem] text-muted mb-6 max-w-md font-medium leading-relaxed"
          >
            Post campaigns. Match creators. Pay on results. The decentralized marketplace for performance.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: appleEase, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          >
            <button onClick={() => handleRoleEntry('brand')} className="hero-cta px-6 py-3 rounded-full bg-white text-black text-sm font-medium text-center flex items-center justify-center gap-2">
              I'm a Brand <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => handleRoleEntry('creator')} className="hero-cta px-6 py-3 rounded-full glass-panel text-white text-sm font-medium text-center hover:bg-white/10">
              I'm a Creator
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: y2, opacity, scale, willChange: "transform, opacity" }}
          className="relative h-[300px] sm:h-[380px] lg:h-[500px] xl:h-[560px] w-full flex items-center justify-center"
        >
          {/* Apple-style clean visual container */}
          <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
            {/* The Circle */}
            <motion.div
              className="absolute inset-0 border border-white/10 rounded-full will-change-transform"
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-8 border border-white/5 rounded-full" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 md:w-48 md:h-48 bg-gradient-to-br from-cyan/30 to-purple/30 rounded-full blur-2xl opacity-60 animate-pulse"></div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.5, ease: appleEase, delay: 0.4 }}
                className="w-24 h-24 md:w-40 md:h-40 glass-panel rounded-full z-10 flex items-center justify-center shadow-2xl"
              >
                {/* The massively oversized image as requested previously */}
                <div className="relative z-20 lg:-translate-x-12 xl:-translate-x-16">
                  <motion.img
                    src="/SorsaMarketlogo.PNG"
                    alt="SorsaMarket Logo"
                    className="w-[76vw] h-[76vw] sm:w-[360px] sm:h-[360px] md:w-[480px] md:h-[480px] lg:w-[620px] lg:h-[620px] xl:w-[680px] xl:h-[680px] max-w-[280px] sm:max-w-none object-contain drop-shadow-2xl will-change-transform"
                    initial={{ y: 20 }}
                    animate={{ y: [-10, 10, -10] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    {
      icon: <Megaphone className="w-6 h-6 text-white" />,
      title: "Post Campaign",
      desc: "Set clear objectives, define your target audience, and assign a reward for each interaction."
    },
    {
      icon: <Search className="w-6 h-6 text-white" />,
      title: "Match Creators",
      desc: "Campaigns are paired with high-value creators who can effectively deliver on your key objectives and goals."
    },
    {
      icon: <Wallet className="w-6 h-6 text-white" />,
      title: "Reward Distribution",
      desc: "Rewards are distributed after participant posts are verified and the required targets are met."
    }
  ];

  return (
    <section className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          id="how-it-works"
          className="scroll-mt-10 text-center mb-20 md:scroll-mt-0"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: appleEase }}
        >
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">How it works.</h2>
          <p className="text-xl text-muted max-w-2xl mx-auto">Three simple steps to launch your performance-driven campaign.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              className="relative rounded-3xl p-[1px] overflow-hidden group"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.15, duration: 0.8, ease: appleEase }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="glass-panel rounded-3xl p-10 flex flex-col items-start relative overflow-hidden h-full w-full bg-black/40 backdrop-blur-3xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-full"></div>

                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10">
                  {step.icon}
                </div>
                <div className="text-sm font-semibold text-cyan mb-3 tracking-wider uppercase">
                  Step 0{idx + 1}
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">{step.title}</h3>
                <p className="text-muted leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureSection = ({ id, title, subtitle, features, reverse }: any) => {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          id={id}
          className="scroll-mt-10 mb-20 md:w-2/3 md:scroll-mt-0"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: appleEase }}
        >
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">{title}</h2>
          <p className="text-xl text-muted">{subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature: any, idx: number) => (
            <motion.div
              key={idx}
              className={`relative rounded-[2.5rem] p-[1px] overflow-hidden group ${idx === 0 || idx === 3 ? 'md:col-span-2' : 'md:col-span-1'}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.8, ease: appleEase }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="glass-panel rounded-[2.5rem] p-10 flex flex-col justify-between h-full w-full bg-black/40 backdrop-blur-3xl relative overflow-hidden">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-12 border border-white/5">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3 text-white tracking-tight">{feature.title}</h3>
                  <p className="text-muted leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const StatsBar = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent absolute top-0"></div>
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent absolute bottom-0"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: appleEase }}
            className="py-8 md:py-0"
          >
            <div className="text-6xl md:text-7xl font-semibold tracking-tighter text-white mb-4">10k+</div>
            <div className="text-sm font-medium text-muted uppercase tracking-widest">Creators</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.1 }}
            className="py-8 md:py-0"
          >
            <div className="text-6xl md:text-7xl font-semibold tracking-tighter text-white mb-4">500+</div>
            <div className="text-sm font-medium text-muted uppercase tracking-widest">Brands</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: appleEase, delay: 0.2 }}
            className="py-8 md:py-0"
          >
            <div className="text-6xl md:text-7xl font-semibold tracking-tighter text-white mb-4">$2M+</div>
            <div className="text-sm font-medium text-muted uppercase tracking-widest">In Rewards</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-black py-20 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="text-2xl font-semibold text-white tracking-tight mb-6 flex items-center gap-2">
              <img src="/SorsaMarketlogo.PNG" alt="Logo" className="w-6 h-6 object-contain" />
              SorsaMarket
            </div>
            <p className="text-sm text-muted mb-8 max-w-xs leading-relaxed">
              The decentralized marketplace connecting brands with creators.
            </p>
            <div className="flex space-x-5">
              <a href="#" className="text-muted hover:text-white transition-colors"><XLogo className="w-5 h-5" /></a>
              <a href="#" className="text-muted hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-muted hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-muted">
              <li><a href="/docs#for-brands" className="hover:text-white transition-colors">For Brands</a></li>
              <li><a href="/docs#for-creators" className="hover:text-white transition-colors">For Creators</a></li>
              <li><a href="/docs#how-it-works" className="hover:text-white transition-colors">How it Works</a></li>
              <li><a href="/docs#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-muted">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-muted">
              <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-sm text-muted flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {new Date().getFullYear()} SorsaMarket. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FAQ = () => {
  const faqs = [
    {
      q: "What is SorsaMarket?",
      a: "SorsaMarket is an influence marketplace where creators earn by scaling projects and brands through quality contents on X."
    },
    {
      q: "Who is eligible to join campaigns?",
      a: "Anyone with a Sorsa score of 150 and above is eligible."
    },
    {
      q: "What kind of contents are accepted on SorsaMarket?",
      a: (
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Contents must be exclusive to the brand you're campaigning for.</li>
          <li>Inclusion of multiple project handles in contents is deemed bad.</li>
          <li>Contents must correspond with atleast one of the requested objectives of the brand.</li>
          <li>Spammy/Copy pasted contents will be are not allowed.</li>
          <li className="list-none mt-4 text-red-400 font-medium">Breaking of any of this rules continuously may result in a ban.</li>
        </ul>
      )
    }
  ];

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          id="faq"
          className="scroll-mt-10 text-center mb-20 md:scroll-mt-0"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: appleEase }}
        >
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">FAQ.</h2>
          <p className="text-xl text-muted">Everything you need to know about SorsaMarket.</p>
        </motion.div>

        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8, ease: appleEase }}
              className="glass-panel rounded-3xl p-8 border border-white/10"
            >
              <h3 className="text-xl font-semibold text-white mb-4">{faq.q}</h3>
              <div className="text-muted leading-relaxed">{faq.a}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const TeamSection = () => {
  const members = [
    {
      name: 'TMDEFI',
      role: 'Co-founder & CEO',
      handle: '@tmdefi',
      url: 'https://x.com/tmdefi',
      initials: 'TD',
      image: '/team-tmdefi.jpg',
      ring: 'conic-gradient(from 140deg, #8B5CF6, #EC4899, #22D3EE, #8B5CF6)'
    },
    {
      name: 'GOATXII3',
      role: 'Co-founder & CMO',
      handle: '@goatxii3',
      url: 'https://x.com/goatxii3',
      initials: 'GX',
      image: '/team-goatxii3.jpg',
      ring: 'conic-gradient(from 140deg, #14B8A6, #22D3EE, #A3E635, #14B8A6)'
    },
    {
      name: 'KHALID',
      role: 'Co-founder & CTO',
      handle: '@khaliddesigns',
      url: 'https://x.com/khaliddesigns',
      initials: 'KH',
      image: '/team-khalid.jpg',
      ring: 'conic-gradient(from 140deg, #FB7185, #F97316, #FACC15, #FB7185)'
    },
    {
      name: 'YUSUFPLUG',
      role: 'Co-founder & COO',
      handle: '@yusufplug_',
      url: 'https://x.com/yusufplug_',
      initials: 'YP',
      image: '/team-yusufplug.jpg',
      ring: 'conic-gradient(from 140deg, #F59E0B, #FACC15, #FB7185, #F59E0B)'
    }
  ];

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-[0.28em] text-muted uppercase">Meet the Team</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {members.map((member) => (
            <a
              key={member.name}
              href={member.url}
              target="_blank"
              rel="noreferrer"
              className="group min-w-0 border border-white/10 hover:border-cyan/60 rounded-2xl p-3 sm:p-6 flex flex-col items-center text-center transition-colors duration-300 bg-black"
            >
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full p-[3px]" style={{ background: member.ring }}>
                <div className="w-full h-full rounded-full bg-[#0B0A0F] p-1">
                  <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                    {'image' in member && member.image ? (
                      <img
                        src={member.image}
                        alt={`${member.name} avatar`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold text-white tracking-tight">{member.initials}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-white/10 my-4 sm:my-6"></div>

              <h3 className="max-w-full truncate text-[11px] sm:text-sm font-bold tracking-[0.12em] sm:tracking-[0.18em] uppercase text-white">{member.name}</h3>
              <div className="mt-2 sm:mt-3 max-w-full px-2 sm:px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[8px] sm:text-[11px] font-semibold leading-tight tracking-wide sm:tracking-wider text-cyan uppercase">
                {member.role}
              </div>
              <div className="mt-3 sm:mt-4 flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-muted group-hover:text-white transition-colors">
                <XLogo className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{member.handle}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function Landing() {
  const brandFeatures = [
    { icon: <ShieldCheck className="w-6 h-6 text-white" />, title: "Verified Creators", desc: "Every creator is vetted for authentic engagement and influence with the help of Sorsa." },
    { icon: <Target className="w-6 h-6 text-white" />, title: "Campaign Control", desc: "Set precise requirements, budgets, and objectives for your campaigns." },
    { icon: <Wallet className="w-6 h-6 text-white" />, title: "Pay-on-Delivery", desc: "Funds are securely held and released only upon successful completion of campaign objectives." },
    { icon: <BarChart3 className="w-6 h-6 text-white" />, title: "Real Analytics", desc: "Track performance, reach, and ROI in real-time from your dashboard." }
  ];

  const creatorFeatures = [
    { icon: <Wallet className="w-6 h-6 text-white" />, title: "Real Paid Campaigns", desc: "Access premium campaigns from verified brands ready to pay." },
    { icon: <Megaphone className="w-6 h-6 text-white" />, title: "No Cold Outreach", desc: "Stop pitching. Browse available campaigns and apply with one click." },
    { icon: <CheckCircle2 className="w-6 h-6 text-white" />, title: "Transparent Rewards", desc: "Know exactly what you'll earn before you start creating content." },
    { icon: <Star className="w-6 h-6 text-white" />, title: "Build Reputation", desc: "Complete campaigns successfully to level up and access higher tiers." }
  ];

  return (
    <div className="landing-page min-h-screen bg-black text-[#F5F5F7] font-sans selection:bg-cyan/30 selection:text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <FeatureSection
        id="for-brands"
        title="For Brands."
        subtitle="Scale your reach with authentic voices."
        features={brandFeatures}
      />
      <FeatureSection
        id="for-creators"
        title="For Creators."
        subtitle="Monetize your audience on your terms."
        features={creatorFeatures}
      />
      <StatsBar />
      <FAQ />
      <TeamSection />
      <Footer />
    </div>
  );
}
