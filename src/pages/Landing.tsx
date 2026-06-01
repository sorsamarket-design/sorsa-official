import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
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

const appleEase = [0.16, 1, 0.3, 1];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: appleEase }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex justify-center ${isScrolled ? 'py-4 px-4' : 'py-6 px-6'}`}
    >
      <div className={`transition-all duration-500 w-full max-w-7xl mx-auto flex items-center justify-between ${isScrolled ? 'bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full py-3 px-6' : 'bg-transparent'}`}>
        <div className="text-xl font-semibold text-white tracking-tight flex items-center gap-3">
          <img src="/sosomarket.png" alt="Logo" className="w-8 h-8 object-contain" />
          <div>Sorsa<span className="text-cyan">.market</span></div>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <a href="#how-it-works" className="text-sm font-medium text-muted hover:text-white transition-colors">How It Works</a>
          <a href="#for-brands" className="text-sm font-medium text-muted hover:text-white transition-colors">For Brands</a>
          <a href="#for-creators" className="text-sm font-medium text-muted hover:text-white transition-colors">For Creators</a>
          <a href="#faq" className="text-sm font-medium text-muted hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="hidden md:block">
          <button onClick={() => navigate('/login')} className="px-5 py-2 rounded-full bg-white text-black font-medium text-sm hover:scale-105 transition-transform duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
            Join Waitlist
          </button>
        </div>

        <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
          <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} className="px-6 py-3 text-center rounded-full bg-white text-black font-medium text-sm mt-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
            Join Waitlist
          </button>
        </div>
      )}
    </motion.nav>
  );
};

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -100]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 0.95]);
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      {/* Subtle Apple-style Ambient Glow */}
      <motion.div style={{ y: y1, opacity: useTransform(scrollY, [0, 500], [0.5, 0]), willChange: "transform, opacity" }} className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] md:w-[800px] h-[200px] md:h-[400px] bg-cyan/20 blur-[80px] md:blur-[120px] rounded-full pointer-events-none"></motion.div>
      <motion.div style={{ y: y2, opacity: useTransform(scrollY, [0, 500], [0.5, 0]), willChange: "transform, opacity" }} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[150px] md:h-[300px] bg-purple/20 blur-[80px] md:blur-[120px] rounded-full pointer-events-none"></motion.div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center z-10 w-full">
        <motion.div 
          style={{ y: y1, opacity, scale, willChange: "transform, opacity" }}
          className="flex flex-col items-start"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: appleEase }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-medium text-cyan mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan"></span>
            </span>
            Platform Beta 1.0
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: appleEase, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter leading-[1.05] mb-6 text-gradient"
          >
            Where Brands <br/> Meet Creators.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: appleEase, delay: 0.2 }}
            className="text-base md:text-lg text-muted mb-8 max-w-md font-medium leading-relaxed"
          >
            Post campaigns. Match creators. Pay on results. The decentralized marketplace for performance.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: appleEase, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button onClick={() => navigate('/auth/brand')} className="px-8 py-4 rounded-full bg-white text-black font-medium text-center hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-2">
              I'm a Brand <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/auth/creator')} className="px-8 py-4 rounded-full glass-panel text-white font-medium text-center hover:bg-white/10 transition-colors duration-300">
              I'm a Creator
            </button>
          </motion.div>
        </motion.div>

        <motion.div 
          style={{ y: y2, opacity, scale, willChange: "transform, opacity" }}
          className="relative h-[400px] sm:h-[500px] lg:h-[700px] w-full flex items-center justify-center"
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
                <motion.img 
                  src="/sosomarket.png" 
                  alt="SorsaMarket Logo" 
                  className="w-[80vw] h-[80vw] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px] max-w-[300px] sm:max-w-none object-contain z-20 relative drop-shadow-2xl will-change-transform" 
                  initial={{ y: 20 }}
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
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
    <section id="how-it-works" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          className="text-center mb-20"
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
    <section id={id} className="py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          className="mb-20 md:w-2/3"
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

const Waitlist = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section id="waitlist" className="py-40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan/5 pointer-events-none"></div>
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: appleEase }}
          className="relative rounded-[3rem] p-[1px] overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="glass-panel rounded-[3rem] p-8 md:p-20 relative overflow-hidden h-full w-full bg-black/40 backdrop-blur-3xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight mb-6 text-white">Get early access.</h2>
            <p className="text-lg md:text-xl text-muted mb-12 max-w-xl mx-auto">Join the waitlist to be notified when we launch. Limited spots available for the beta program.</p>
            
            {submitted ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 border border-white/20 text-white p-6 rounded-2xl flex items-center justify-center gap-3 max-w-md mx-auto backdrop-blur-md"
              >
                <CheckCircle2 className="w-6 h-6 text-cyan" />
                <span className="font-medium">You're on the list! We'll be in touch.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto relative z-20 w-full">
                <input 
                  type="email" 
                  required
                  placeholder="Enter your email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 w-full bg-white/5 border border-white/10 rounded-full px-6 md:px-8 py-4 md:py-5 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all placeholder:text-muted"
                />
                <button 
                  type="submit"
                  className="bg-white text-black px-8 md:px-10 py-4 md:py-5 rounded-full font-semibold hover:scale-105 transition-transform duration-300 whitespace-nowrap shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] w-full sm:w-auto"
                >
                  Join Waitlist
                </button>
              </form>
            )}
          </div>
        </motion.div>
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
              <img src="/sosomarket.png" alt="Logo" className="w-6 h-6 object-contain" />
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
              <li><a href="#for-brands" className="hover:text-white transition-colors">For Brands</a></li>
              <li><a href="#for-creators" className="hover:text-white transition-colors">For Creators</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
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
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
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
    <section id="faq" className="py-32 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div 
          className="text-center mb-20"
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
    <div className="min-h-screen bg-black text-[#F5F5F7] font-sans selection:bg-cyan/30 selection:text-white overflow-x-hidden">
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
      <Waitlist />
      <Footer />
    </div>
  );
}
