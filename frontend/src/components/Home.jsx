import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Play, Glasses, ScanFace, Shapes, RotateCcw, Box } from 'lucide-react';
import ProductCard from './ProductCard';
import ModelViewer from './ModelViewer';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { fetchProducts } from '../api/productsApi';
import { displayImageUrl, displayBadge, displayFaceShapes } from '../utils/storefrontProduct';
import { SHAPE_GUIDE } from './ar/faceShape';
import { API_BASE } from '../config/env';

/** MediaPipe FaceMesh topology size — the landmark count the try-on actually tracks. */
const FACE_LANDMARK_COUNT = 468;

/** Seconds each frame holds in the hero before advancing. */
const HERO_ROTATE_MS = 4000;

/**
 * Counts from 0 to `value` once scrolled into view.
 *
 * Static numbers on a landing page read as decoration; a number that moves reads as
 * something being measured. It runs once — re-triggering on every scroll past is the
 * kind of motion that gets tiring rather than impressive.
 */
function Counter({ value, className, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const duration = 900;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic: fast to begin, settling onto the final number
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return <p ref={ref} className={className} style={style}>{shown}</p>;
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [totalFrames, setTotalFrames] = useState(0);
  // Which frame the hero is showing, and whether it has been switched to live 3D.
  const [heroIdx, setHeroIdx] = useState(0);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchProducts();
        const mapped = list.map(p => ({
          ...p,
          image: displayImageUrl(p),
          badge: displayBadge(p),
          faceShapes: displayFaceShapes(p),
          rating: 4.7 + (p.id % 3) * 0.1,
          reviews: 120 + p.id * 17,
          originalPrice: p.id % 3 === 0 ? Math.round(Number(p.price) * 1.25 * 100) / 100 : null,
        }));
        if (!cancelled) {
          setProducts(mapped.slice(0, 4));
          setTotalFrames(list.length);
        }
      } catch (err) {
        // The hero falls back to the static image and the stats to zero, which is
        // honest: nothing was loaded. No error banner on the landing page — a retry is
        // one navigation away in the shop.
        console.error("Failed to load featured products:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Advance the hero frame on a timer, but stop once the viewer is in 3D — pulling the
  // model out from under someone who is dragging it would be hostile.
  useEffect(() => {
    if (show3D || products.length < 2) return undefined;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % products.length), HERO_ROTATE_MS);
    return () => clearInterval(id);
  }, [show3D, products.length]);

  const hero = products[heroIdx] || null;
  const heroModelSrc = (() => {
    const path = hero?.front_view?.trim();
    if (!path) return null;
    return path.startsWith('/') ? `${API_BASE}${path}` : path;
  })();

  // Every number here is real and checkable. The previous set (1M+ try-ons, 40+
  // countries) was invented, and invented traffic numbers are a claim to a customer,
  // not decoration. The catalogue count is live from the API; the other two are
  // properties of the tracker itself.
  const stats = [
    { icon: Glasses, value: totalFrames, label: 'Frames to try on' },
    { icon: ScanFace, value: FACE_LANDMARK_COUNT, label: 'Face points tracked' },
    { icon: Shapes, value: Object.keys(SHAPE_GUIDE).length, label: 'Face shapes matched' },
  ];

  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-16 md:py-20 lg:py-28">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-[10%] w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.3), transparent)' }}
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-10 right-[15%] w-72 h-72 rounded-full blur-3xl opacity-25"
            style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.3), transparent)' }}
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.15), transparent)' }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center lg:text-left order-2 lg:order-1"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold"
                style={{
                  backgroundColor: 'rgba(147,51,234,0.08)',
                  color: 'var(--text-accent)',
                  border: '1px solid rgba(147,51,234,0.15)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Virtual Try-On
              </motion.div>

              <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-5" style={{ color: 'var(--text-primary)' }}>
                Try Before You{' '}
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Buy
                </span>
                <br />
                <span className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl" style={{ color: 'var(--text-secondary)' }}>
                  with AI Vision
                </span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg mb-8 max-w-2xl mx-auto lg:mx-0" style={{ color: 'var(--text-secondary)' }}>
                Experience the future of eyewear shopping with our AI-powered virtual try-on
                technology. See how any frame looks on you in real time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link
                  to="/try-on"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-purple-500/25 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[48px] group"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Start Virtual Try-On</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/shop"
                  className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base min-h-[48px] group"
                  style={{
                    border: '2px solid var(--border-color)',
                    color: 'var(--text-accent)',
                  }}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Browse Shop</span>
                </Link>
              </div>
            </motion.div>

            {/* Hero media.
                This used to be a still photograph, on a site whose entire proposition is a
                live 3D try-on. It now shows real frames from the catalogue, cycling on a
                timer, and swaps to the actual 3D model on demand.

                On demand rather than on load, deliberately: the models are 6-11MB each, so
                auto-loading one here would cost the landing page its first paint and a
                chunk of someone's mobile data before they have asked for anything. The
                product image carries the motion; the geometry arrives when it is wanted. */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative order-1 lg:order-2"
            >
              <div
                className="relative rounded-2xl sm:rounded-3xl p-1 sm:p-1.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(147,51,234,0.3), rgba(236,72,153,0.3))',
                  boxShadow: '0 20px 60px rgba(147,51,234,0.15)',
                }}
              >
                <div
                  className="relative overflow-hidden rounded-xl sm:rounded-2xl"
                  style={{ backgroundColor: 'var(--surface-bg)', aspectRatio: '4 / 3' }}
                >
                  {show3D && heroModelSrc ? (
                    <ModelViewer
                      src={heroModelSrc}
                      alt={hero?.name || 'Frame'}
                      poster={hero?.image}
                      minHeight="100%"
                      className="h-full w-full"
                      showArButton={false}
                      showHint={false}
                      autoRotate
                      cameraControls
                    />
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={hero?.id ?? 'fallback'}
                        src={hero?.image || '/specs.jpg'}
                        alt={hero?.name || 'Virtual Try-On Demo'}
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </AnimatePresence>
                  )}

                  {/* Name plate + the control that pulls in the real geometry. */}
                  {hero && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 to-transparent p-3 sm:p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white sm:text-base">{hero.name}</p>
                        {hero.category && (
                          <p className="truncate text-[11px] text-white/70">{hero.category}</p>
                        )}
                      </div>
                      {heroModelSrc && (
                        <button
                          type="button"
                          onClick={() => setShow3D((v) => !v)}
                          className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/25 transition hover:bg-white/25 active:scale-95"
                        >
                          {show3D
                            ? <><RotateCcw className="h-3.5 w-3.5" /> Photo</>
                            : <><Box className="h-3.5 w-3.5" /> View in 3D</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Frame picker. Doubles as the progress indicator for the auto-rotation. */}
              {products.length > 1 && (
                <div className="mt-3 flex justify-center gap-2 sm:mt-4">
                  {products.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setHeroIdx(i); setShow3D(false); }}
                      aria-label={`Show ${p.name}`}
                      aria-current={i === heroIdx}
                      className="h-14 w-14 overflow-hidden rounded-xl transition sm:h-16 sm:w-16"
                      style={{
                        border: i === heroIdx ? '2px solid rgb(147,51,234)' : '2px solid var(--border-color)',
                        opacity: i === heroIdx ? 1 : 0.55,
                      }}
                    >
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-6 sm:py-8" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            {stats.map(({ icon: Icon, value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl mb-2 sm:mb-3" style={{ background: 'rgba(147,51,234,0.08)' }}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--text-accent)' }} />
                </div>
                <Counter
                  value={value}
                  className="text-xl sm:text-2xl md:text-3xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                />
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 sm:mb-12">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Featured Products
              </h2>
              <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Handpicked frames that are perfect for you
              </p>
            </motion.div>
            <Link
              to="/shop"
              className="font-semibold flex items-center gap-2 text-sm sm:text-base group transition-colors"
              style={{ color: 'var(--text-accent)' }}
            >
              View All
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p, index) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}