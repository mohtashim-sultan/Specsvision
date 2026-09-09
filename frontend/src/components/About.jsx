import React from 'react';
import { Link } from 'react-router-dom';
import {
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
    name: 'Mohtashim Sultan',
    role: 'Co-founder & CTO',
    focus: 'AI & 3D AR Vision',
    initials: 'MS',
    description:
      'Leads the engineering behind our real-time 3D facial tracking, neural face-shape classification, and WebGL virtual try-on engine.',
  },
  {
    name: 'Abdul Ahad',
    role: 'Head Designer',
    focus: 'Frame Aesthetics & Ergonomics',
    initials: 'AA',
    description:
      'Directs eyewear aesthetic design, 3D CAD modeling, and ergonomic temple curvature for lightweight everyday comfort.',
  },
  {
    name: 'Moheed Khan',
    role: 'VP Customer Experience',
    focus: 'Trials & Client Support',
    initials: 'MK',
    description:
      'Oversees customer success, 7-day home trial logistics, and personalized optical styling support.',
  },
];

const milestones = [
  { title: '1M+ Try-Ons', description: 'Done online by users across our platform.' },
  { title: '95% Fit Accuracy', description: 'Industry-leading facial fit predictions.' },
  { title: 'Global Shipping', description: 'Ships to 40+ countries with live tracking.' },
];

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
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>2018 · Pakistan , Lahore</p>
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
                  className="rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between"
                  style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base text-purple-600 dark:text-purple-300 shadow-inner flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.15), rgba(236,72,153,0.15))', border: '1.5px solid var(--border-color)' }}
                      >
                        {member.initials}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</h2>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-accent)' }}>{member.role}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md mb-2" style={{ backgroundColor: 'rgba(147,51,234,0.08)', color: 'var(--text-accent)' }}>
                        {member.focus}
                      </span>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {member.description}
                      </p>
                    </div>
                  </div>
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
                  className="inline-flex items-center justify-center rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl transition min-h-[42px]"
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
                  { icon: MapPin, text: 'Amanah Mall , Lahore, Pakistan' },
                  { icon: Phone, text: '(+923)12 2255436' },
                  { icon: Mail, text: 'specsvision1@gmail.com' },
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
                  src="https://maps.google.com/maps?q=Amanah%20Mall%20,%20Lahore,%20Pakistan&t=&z=13&ie=UTF8&iwloc=&output=embed"
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
