import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Upload,
  Wand2,
  MapPin,
  Phone,
  Mail,
  Clock3,
  CheckCircle2,
} from 'lucide-react';

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
  {
    title: '1M+ Try-Ons',
    description: 'Done online by users across our platform.',
  },
  {
    title: '95% Fit Accuracy',
    description: 'Industry-leading facial fit predictions.',
  },
  {
    title: 'Global Shipping',
    description: 'Ships to 40+ countries with live tracking.',
  },
];

const featuredFrames = ['Oval Classic', 'Aviator Lite', 'Willow Round', 'Vector Slim'];

export default function About() {
  return (
    <main className="py-8 sm:py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-7 items-start">
          <section className="lg:col-span-7 space-y-5">
            <article className="rounded-2xl border border-purple-100 bg-white/90 p-5 sm:p-7 shadow-sm">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">About SpecsVision</h1>
              <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                At SpecsVision we blend optical craftsmanship with cutting-edge AI to create the
                most realistic virtual try-on experience for eyewear. Our mission is to make
                choosing glasses effortless by showing you how every look fits in real time, powered
                by machine learning and optical precision.
              </p>
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-purple-700 font-semibold">
                    Founded
                  </p>
                  <p className="text-sm text-gray-700 mt-1">2018 · San Francisco, CA</p>
                </div>
                <div className="rounded-xl border border-pink-100 bg-pink-50/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-pink-700 font-semibold">
                    Fit-Driven Vision
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Free 7-day home trials on select frames
                  </p>
                </div>
              </div>
            </article>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {teamMembers.map((member) => (
                <article
                  key={member.name}
                  className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm min-h-[172px] flex flex-col text-center"
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-100 mx-auto"
                  />
                  <h2 className="mt-3 text-sm font-semibold text-gray-900">{member.name}</h2>
                  <p className="text-xs text-purple-700 mt-1">{member.role}</p>
                  <p className="text-xs text-gray-500 mt-1">{member.focus}</p>
                </article>
              ))}
            </div>

            <article className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Milestones</h2>
              <div className="mt-3 grid sm:grid-cols-3 gap-3">
                {milestones.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-purple-100 bg-purple-50/40 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-purple-100 bg-white p-5 sm:p-6 shadow-sm lg:min-h-[400px]">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Contact &amp; Guidance</h2>
              <p className="mt-2 text-sm text-gray-600">
                Get frame recommendations, lens advice, and order support from our specialists in
                one place.
              </p>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Share your face shape, style preferences, and lens priorities, and our team will
                suggest options that match comfort, daily use, and budget. We also review fit
                screenshots to reduce returns and improve confidence before checkout.
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    Personalized fit recommendations
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Tell us your style and fit preferences for tailored suggestions.
                  </p>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    Fast response support
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Our team replies quickly for trial, order, and prescription help.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid sm:grid-cols-3 gap-2">
                <div className="rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-700 font-semibold">
                    Avg Reply
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">&lt; 2 hours</p>
                </div>
                <div className="rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-700 font-semibold">
                    Guidance Quality
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">95% helpful rating</p>
                </div>
                <div className="rounded-lg border border-purple-100 bg-purple-50/30 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-700 font-semibold">
                    Coverage
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">Fit + Lens + Order</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition min-h-[42px]"
                >
                  Open Contact Form
                </Link>
                <Link
                  to="/try-on"
                  className="inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition min-h-[42px]"
                >
                  Start Virtual Try-On
                </Link>
              </div>
              <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/30 px-4 py-3">
                <p className="text-xs font-semibold text-gray-900">Why customers choose SpecsVision</p>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                  Better fit confidence, faster support, and practical lens guidance to help you
                  pick the right frame in one pass.
                </p>
              </div>
            </article>
          </section>

          <aside className="lg:col-span-5 space-y-5">
            <article className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-purple-700">Virtual Try-On</h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Try frames on in live webcam or upload a photo to see realistic fit and proportions.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-700">
                  Width: Natural
                </button>
                <button className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-700">
                  Front
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-purple-100 p-2 bg-gradient-to-b from-purple-50 to-pink-50">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80"
                  alt="Virtual try-on preview"
                  className="w-full h-56 object-cover rounded-lg"
                />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Featured Frames</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {featuredFrames.map((frame) => (
                  <div
                    key={frame}
                    className="rounded-lg border border-purple-100 bg-purple-50/40 px-2.5 py-2 text-xs text-gray-700 text-center"
                  >
                    {frame}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  to="/try-on"
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white min-h-[38px]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Try On Live
                </Link>
                <button className="inline-flex items-center justify-center gap-1 rounded-full border border-purple-200 px-4 py-2 text-xs font-semibold text-purple-700 min-h-[38px]">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Tip: Use bright natural lighting for the most realistic lens and frame match.
              </p>
            </article>

            <article className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Store &amp; Support</h3>
              <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
                  <span>1234 Market St, San Francisco, CA 94103</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-600" />
                  <span>(415) 555-0182</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <span>help@specsvision.com</span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-purple-600" />
                  <span>Mon-Fri 9am-6pm</span>
                </p>
              </div>
            </article>

            <article className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Visit Our Flagship</h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-purple-100">
                <iframe
                  title="SpecsVision store map"
                  src="https://maps.google.com/maps?q=1234%20Market%20St%20San%20Francisco&t=&z=13&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-52 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Open Mon-Fri, 9am-6pm. Walk-ins and virtual consults welcome.
              </p>
              <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-purple-700">
                <Wand2 className="w-3.5 h-3.5" />
                Book a free styling consult
              </button>
            </article>
          </aside>
        </div>
      </div>
    </main>
  );
}
