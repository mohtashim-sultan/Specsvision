import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  MessageSquareText,
  Mail,
  Sparkles,
  User,
  AtSign,
  Phone as PhoneIcon,
  MessageSquare,
  Send,
} from 'lucide-react';
import { motion } from 'framer-motion';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  topic: 'Try On Issue',
  message: '',
  callback: false,
};

const tryOnProducts = [
  { name: 'Archer', price: 'PKR 129' },
  { name: 'Marin', price: 'PKR 149' },
  { name: 'Lucent', price: 'PKR 169' },
  { name: 'Harper', price: 'PKR 159' },
];

const faqs = [
  { q: 'How accurate is the AI prediction?', a: 'Our model uses over 1M try-on samples and delivers fit confidence around 95%.' },
  { q: 'Can I try frames at home?', a: 'Yes, we ship frame samples for our free trial and you can test them for 7 days.' },
  { q: 'What if my prescription changes?', a: 'Contact support with your new prescription and we will update lens options.' },
];

export default function Contact() {
  const [form, setForm] = useState(initialForm);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please add your name, email, and message.');
      return;
    }
    const subject = `SpecsVision Contact - ${form.topic}`;
    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone || 'Not provided'}`,
      `Topic: ${form.topic}`,
      `Need callback: ${form.callback ? 'Yes' : 'No'}`,
      '',
      'Message:',
      form.message,
    ].join('\n');
    const to = 'help@specsvision.com';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!win) window.location.href = mailtoUrl;
    toast.success('Opening Gmail compose with your details...');
    setForm(initialForm);
  };

  const inputStyle = {
    backgroundColor: 'var(--surface-bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  return (
    <main className="py-8 sm:py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Hero Banner */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 sm:p-6 lg:p-7 shadow-sm"
          style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
        >
          <div className="grid lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-7">
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Need help with fit or try-on?
              </h1>
              <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Our AI-powered try-on makes finding the perfect frames easy. Chat with us
                or schedule a free trial.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/try-on" className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white min-h-[40px] inline-flex items-center shadow-md shadow-purple-500/25">
                  Live Webcam Fit
                </Link>
                {['Schedule Free Trial'].map(label => (
                  <button key={label} className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold min-h-[40px]" style={{ border: '2px solid var(--border-color)', color: 'var(--text-accent)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 rounded-xl p-2.5 overflow-hidden" style={{ background: 'linear-gradient(to br, rgba(147,51,234,0.06), rgba(236,72,153,0.06))', border: '1px solid var(--border-color)' }}>
              <img
                src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80"
                alt="Eyewear assistance"
                className="w-full h-36 sm:h-44 object-cover rounded-lg"
              />
              <p className="mt-2 text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                Expert help available - average response under 2 hours
              </p>
            </div>
          </div>
        </motion.section>

        <section className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Contact Form */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7 rounded-2xl p-4 sm:p-6 shadow-sm"
            style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
          >
            <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Contact Support</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Submit a message and our specialists will get back with personalized recommendations.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Name */}
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Full name</span>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input name="name" value={form.name} onChange={handleChange} type="text" required placeholder="Enter full name"
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                      style={inputStyle} />
                  </div>
                </label>
                {/* Email */}
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Email address</span>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input name="email" value={form.email} onChange={handleChange} type="email" required placeholder="name@example.com"
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                      style={inputStyle} />
                  </div>
                </label>
                {/* Phone */}
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Phone (optional)</span>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="(555) 123-4567"
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30"
                      style={inputStyle} />
                  </div>
                </label>
                {/* Topic */}
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Topic</span>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <select name="topic" value={form.topic} onChange={handleChange}
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30 appearance-none"
                      style={inputStyle}>
                      <option>Try On Issue</option>
                      <option>Lens Advice</option>
                      <option>Shipping &amp; Returns</option>
                      <option>Order Support</option>
                    </select>
                  </div>
                </label>
              </div>

              {/* Message */}
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Message</span>
                <textarea name="message" value={form.message} onChange={handleChange} rows={5} required
                  placeholder="Include frame model, style preference, and any order details."
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/30 resize-none"
                  style={inputStyle} />
              </label>

              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <input name="callback" checked={form.callback} onChange={handleChange} type="checkbox" className="w-4 h-4 accent-purple-600 rounded" />
                Allow a callback from specialist
              </label>

              <div className="flex justify-end">
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all active:scale-[0.98]">
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </div>
            </form>

            {/* Contact Methods */}
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {[
                { icon: PhoneCall, title: 'Call Us', line1: '+1 (800) 555-0145', line2: 'Mon-Fri 9am-5pm PST' },
                { icon: MessageSquareText, title: 'Live Chat', line1: 'Available now', line2: 'Response under 3 minutes' },
                { icon: Mail, title: 'Email', line1: 'help@specsvision.com', line2: 'Response in 1 business day' },
              ].map(({ icon: Icon, title, line1, line2 }) => (
                <div key={title} className="rounded-xl p-3 h-full" style={{ backgroundColor: 'rgba(147,51,234,0.04)', border: '1px solid var(--border-color)' }}>
                  <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Icon className="w-4 h-4" style={{ color: 'var(--text-accent)' }} />
                    {title}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{line1}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{line2}</p>
                </div>
              ))}
            </div>
          </motion.article>

          {/* Sidebar */}
          <aside className="lg:col-span-5 space-y-4 self-start">
            {/* Try-On Preview */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Try-On Preview</h3>
                <p className="text-xs font-medium" style={{ color: 'var(--text-accent)' }}>Best Match</p>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Live webcam - adjust lighting and angle for the best match.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { src: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=500&q=80', alt: 'Try on sample one' },
                  { src: 'https://images.unsplash.com/photo-1617727553252-65863c156eb0?auto=format&fit=crop&w=500&q=80', alt: 'Try on sample two' },
                ].map(img => (
                  <img key={img.alt} src={img.src} alt={img.alt} className="w-full h-32 object-cover rounded-lg" style={{ border: '1px solid var(--border-color)' }} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tryOnProducts.map((item) => (
                  <div key={item.name} className="rounded-lg p-2 min-h-[84px] flex flex-col" style={{ backgroundColor: 'rgba(147,51,234,0.04)', border: '1px solid var(--border-color)' }}>
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-accent)' }}>{item.price}</p>
                    <button className="mt-auto rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', color: 'var(--text-accent)' }}>
                      Try
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Link
                  to="/try-on"
                  className="w-full inline-flex justify-center items-center gap-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-xs font-semibold text-white shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Live
                </Link>
              </div>
            </motion.article>

            {/* FAQ */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}
            >
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Frequently asked</h3>
              <div className="mt-2 space-y-2">
                {faqs.map((item) => (
                  <div key={item.q} className="rounded-lg p-2.5" style={{ backgroundColor: 'rgba(147,51,234,0.04)', border: '1px solid var(--border-color)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.q}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{item.a}</p>
                  </div>
                ))}
              </div>
            </motion.article>
          </aside>
        </section>
      </div>
    </main>
  );
}
