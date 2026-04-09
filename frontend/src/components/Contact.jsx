import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  MessageSquareText,
  Mail,
  Sparkles,
  Upload,
} from 'lucide-react';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  topic: 'Try On Issue',
  message: '',
  callback: false,
};

const tryOnProducts = [
  { name: 'Archer', price: '$129', tone: 'bg-purple-50', accent: 'text-purple-700' },
  { name: 'Marin', price: '$149', tone: 'bg-pink-50', accent: 'text-pink-700' },
  { name: 'Lucent', price: '$169', tone: 'bg-purple-50', accent: 'text-purple-700' },
  { name: 'Harper', price: '$159', tone: 'bg-pink-50', accent: 'text-pink-700' },
];

const faqs = [
  {
    q: 'How accurate is the AI prediction?',
    a: 'Our model uses over 1M try-on samples and delivers fit confidence around 95%.',
  },
  {
    q: 'Can I try frames at home?',
    a: 'Yes, we ship frame samples for our free trial and you can test them for 7 days.',
  },
  {
    q: 'What if my prescription changes?',
    a: 'Contact support with your new prescription and we will update lens options.',
  },
];

export default function Contact() {
  const [form, setForm] = useState(initialForm);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
    if (!win) {
      window.location.href = mailtoUrl;
    }

    toast.success('Opening Gmail compose with your details...');
    setForm(initialForm);
  };

  return (
    <main className="py-8 sm:py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <section className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-6 lg:p-7 shadow-sm">
          <div className="grid lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-7">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Need help with fit or try-on?
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Our AI-powered try-on makes finding the perfect frames easy. Chat, upload a photo,
                or schedule a free trial for select frames and we help every step of the way.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/try-on"
                  className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white min-h-[40px] inline-flex items-center"
                >
                  Live Webcam Fit
                </Link>
                <button className="rounded-full border border-purple-200 px-4 py-2 text-xs sm:text-sm font-semibold text-purple-700 min-h-[40px]">
                  Upload Photo
                </button>
                <button className="rounded-full border border-purple-200 px-4 py-2 text-xs sm:text-sm font-semibold text-purple-700 min-h-[40px]">
                  Schedule Free Trial
                </button>
              </div>
            </div>
            <div className="lg:col-span-5 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-2.5">
              <img
                src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80"
                alt="Eyewear assistance"
                className="w-full h-36 sm:h-44 object-cover rounded-lg"
              />
              <p className="mt-2 text-[11px] text-gray-500 text-center">
                Expert help available - average response under 2 hours
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-12 gap-6 items-start">
          <article className="lg:col-span-7 rounded-2xl border border-purple-100 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Contact Support</h2>
            <p className="mt-1 text-sm text-gray-600">
              Submit a message and one of our specialists reviews your try-on and gets back with
              personalized recommendations.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-700">Full name</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    type="text"
                    required
                    placeholder="Enter full name"
                    className="w-full rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-700">Email address</span>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-700">Phone (optional)</span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    type="tel"
                    placeholder="(555) 123-4567"
                    className="w-full rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-700">Topic</span>
                  <select
                    name="topic"
                    value={form.topic}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option>Try On Issue</option>
                    <option>Lens Advice</option>
                    <option>Shipping & Returns</option>
                    <option>Order Support</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-gray-700">Message</span>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  required
                  placeholder="Include frame model, style preference, and any order details."
                  className="w-full rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </label>

              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  name="callback"
                  checked={form.callback}
                  onChange={handleChange}
                  type="checkbox"
                  className="w-4 h-4 accent-purple-600"
                />
                Allow a callback from specialist
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition"
                >
                  Send Message
                </button>
              </div>
            </form>

            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-purple-100 p-3 bg-purple-50/40 h-full">
                <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-purple-600" />
                  Call Us
                </p>
                <p className="mt-1 text-xs text-gray-600">+1 (800) 555-0145</p>
                <p className="text-xs text-gray-500">Mon-Fri 9am-5pm PST</p>
              </div>
              <div className="rounded-xl border border-purple-100 p-3 bg-purple-50/40 h-full">
                <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                  <MessageSquareText className="w-4 h-4 text-purple-600" />
                  Live Chat
                </p>
                <p className="mt-1 text-xs text-gray-600">Available now</p>
                <p className="text-xs text-gray-500">Response under 3 minutes</p>
              </div>
              <div className="rounded-xl border border-purple-100 p-3 bg-purple-50/40 h-full">
                <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-purple-600" />
                  Email
                </p>
                <p className="mt-1 text-xs text-gray-600">help@specsvision.com</p>
                <p className="text-xs text-gray-500">Response in 1 business day</p>
              </div>
            </div>
          </article>

          <aside className="lg:col-span-5 space-y-4 self-start">
            <article className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900">Try-On Preview</h3>
                <p className="text-xs text-purple-700 font-medium">Best Match</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Live webcam or uploaded photo - adjust lighting and angle.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <img
                  src="https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=500&q=80"
                  alt="Try on sample one"
                  className="w-full h-32 object-cover rounded-lg border border-purple-100"
                />
                <img
                  src="https://images.unsplash.com/photo-1617727553252-65863c156eb0?auto=format&fit=crop&w=500&q=80"
                  alt="Try on sample two"
                  className="w-full h-32 object-cover rounded-lg border border-purple-100"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tryOnProducts.map((item) => (
                  <div
                    key={item.name}
                    className={`rounded-lg border border-purple-100 ${item.tone} p-2 min-h-[84px] flex flex-col`}
                  >
                    <p className="text-[11px] font-semibold text-gray-900">{item.name}</p>
                    <p className={`text-[11px] mt-1 ${item.accent}`}>{item.price}</p>
                    <button className="mt-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-100">
                      Try
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="flex-1 inline-flex justify-center items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-xs font-semibold text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live
                </button>
                <button className="flex-1 inline-flex justify-center items-center gap-1 rounded-full border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700">
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Frequently asked</h3>
              <div className="mt-2 space-y-2">
                {faqs.map((item) => (
                  <div key={item.q} className="rounded-lg border border-purple-100 bg-purple-50/40 p-2.5">
                    <p className="text-xs font-semibold text-gray-900">{item.q}</p>
                    <p className="text-xs text-gray-600 mt-1">{item.a}</p>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
