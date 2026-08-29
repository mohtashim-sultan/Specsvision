import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Wand2,
  MapPin,
  Phone,
  Mail,
  Clock3,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const teamMembers = [
  {
    name: 'Aisha Patel',
    role: 'Co-founder & CTO',
    focus: 'AI and model training',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Marco Ruiz',
    role: 'Head Designer',
    focus: 'Frame aesthetics and ergonomics',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Lena Kim',
    role: 'VP Customer Experience',
    focus: 'Trials and support',
    image:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80',
  },
];

const milestones = [
  { title: '1M+ Try-Ons', description: 'Done online by users across our platform.' },
  { title: '95% Fit Accuracy', description: 'Industry-leading facial fit predictions.' },
  { title: 'Global Shipping', description: 'Ships to 40+ countries with live tracking.' },
];

const featuredFrames = ['Oval Classic', 'Aviator Lite', 'Willow Round', 'Vector Slim'];

export default function About() {
  return (
    <main className="py-8 sm:py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-7 items-start">
          <section className="lg:col-span-7 space-y-5">
            {/* About Card */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 sm:p-7 shadow-sm"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>About SpecsVision</h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                At SpecsVision we blend optical craftsmanship with cutting-edge AI to create the
                most realistic virtual try-on experience for eyewear. Our mission is to make
                choosing glasses effortless by showing you how every look fits in real time, powered
                by machine learning and optical precision.
              </p>
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(147,51,234,0.06)', border: '1px solid var(--border-color)' }}>
                  <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-accent)' }}>Founded</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>2018 · San Francisco, CA</p>
                </div>
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(236,72,153,0.06)', border: '1px solid var(--border-color)' }}>
                  <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-accent)' }}>Fit-Driven Vision</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Free 7-day home trials on select frames</p>
                </div>
              </div>
            </motion.article>

            {/* Team */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {teamMembers.map((member, i) => (
                <motion.article
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="rounded-2xl p-4 shadow-sm min-h-[172px] flex flex-col text-center"
                  style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-16 h-16 rounded-full object-cover mx-auto"
                    style={{ border: '2px solid var(--border-color)' }}
                  />
                  <h2 className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-accent)' }}>{member.role}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{member.focus}</p>
                </motion.article>
              ))}
            </div>

            {/* Milestones */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-4 sm:p-5 shadow-sm"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Milestones</h2>
              <div className="mt-3 grid sm:grid-cols-3 gap-3">
                {milestones.map((item) => (
                  <div key={item.title} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(147,51,234,0.04)', border: '1px solid var(--border-color)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                  </div>
                ))}
              </div>
            </motion.article>

            {/* Contact & Guidance */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl p-5 sm:p-6 shadow-sm"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Contact &amp; Guidance</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Get frame recommendations, lens advice, and order support from our specialists.
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Share your face shape, style preferences, and lens priorities, and our team will
                suggest options that match comfort, daily use, and budget.
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {[
                  { text: 'Personalized fit recommendations', sub: 'Tell us your style and fit preferences for tailored suggestions.' },
                  { text: 'Fast response support', sub: 'Our team replies quickly for trial, order, and prescription help.' },
                ].map(item => (
                  <div key={item.text} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(147,51,234,0.04)', border: '1px solid var(--border-color)' }}>
                    <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--text-accent)' }} />
                      {item.text}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid sm:grid-cols-3 gap-2">
                {[
                  { label: 'Avg Reply', value: '< 2 hours' },
                  { label: 'Guidance Quality', value: '95% helpful rating' },
                  { label: 'Coverage', value: 'Fit + Lens + Order' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(147,51,234,0.04)', border: '1px solid var(--border-color)' }}>
                    <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-accent)' }}>{s.label}</p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl transition min-h-[42px]"
                >
                  Open Contact Form
                </Link>
                <Link
                  to="/try-on"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition min-h-[42px]"
                  style={{ border: '2px solid var(--border-color)', color: 'var(--text-accent)' }}
                >
                  Start Virtual Try-On
                </Link>
              </div>
            </motion.article>
          </section>

          <aside className="lg:col-span-5 space-y-5">
            {/* Try-On Preview */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl p-4 sm:p-5 shadow-sm"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-accent)' }}>Virtual Try-On</h2>
              <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Try frames on live through your webcam.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Width: Natural', 'Front'].map(tag => (
                  <span key={tag} className="rounded-full px-3 py-1.5 text-xs" style={{ backgroundColor: 'rgba(147,51,234,0.06)', color: 'var(--text-accent)', border: '1px solid var(--border-color)' }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 rounded-xl p-2 overflow-hidden" style={{ background: 'linear-gradient(to bottom, rgba(147,51,234,0.06), rgba(236,72,153,0.06))', border: '1px solid var(--border-color)' }}>
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80"
                  alt="Virtual try-on preview"
                  className="w-full h-56 object-cover rounded-lg"
                />
              </div>
              <p className="mt-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Featured Frames</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {featuredFrames.map((frame) => (
                  <div key={frame} className="rounded-lg px-2.5 py-2 text-xs text-center" style={{ backgroundColor: 'rgba(147,51,234,0.04)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                    {frame}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  to="/try-on"
                  className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white min-h-[38px] shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Try On Live
                </Link>
              </div>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                Tip: Use bright natural lighting for the most realistic lens and frame match.
              </p>
            </motion.article>

            {/* Store & Support */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Store &amp; Support</h3>
              <div className="space-y-2 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                {[
                  { icon: MapPin, text: '1234 Market St, San Francisco, CA 94103' },
                  { icon: Phone, text: '(415) 555-0182' },
                  { icon: Mail, text: 'help@specsvision.com' },
                  { icon: Clock3, text: 'Mon-Fri 9am-6pm' },
                ].map(({ icon: Icon, text }) => (
                  <p key={text} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-accent)' }} />
                    <span>{text}</span>
                  </p>
                ))}
              </div>
            </motion.article>

            {/* Flagship */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl p-4 sm:p-5 shadow-sm"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Visit Our Flagship</h3>
              <div className="mt-3 overflow-hidden rounded-xl" style={{ border: '1px solid var(--border-color)' }}>
                <iframe
                  title="SpecsVision store map"
                  src="https://maps.google.com/maps?q=1234%20Market%20St%20San%20Francisco&t=&z=13&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-52 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                Open Mon-Fri, 9am-6pm. Walk-ins and virtual consults welcome.
              </p>
              <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--text-accent)' }}>
                <Wand2 className="w-3.5 h-3.5" />
                Book a free styling consult
              </button>
            </motion.article>
          </aside>
        </div>
      </div>
    </main>
  );
}
