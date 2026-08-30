import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompare } from '../../context/CompareContext';
import { fetchProduct } from '../../api/productsApi';
import { displayImageUrl } from '../../utils/storefrontProduct';
import type { Product } from '../../types/api';

export default function CompareFloatingBar() {
  const { ids, count, clear } = useCompare();
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (ids.length === 0) {
      setPreviewProducts([]);
      return;
    }
    let cancelled = false;
    Promise.all(ids.slice(0, 4).map((id) => fetchProduct(id).catch(() => null))).then((res) => {
      if (!cancelled) {
        setPreviewProducts(res.filter((p): p is Product => p !== null));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (count === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-0 z-[100] px-3 sm:px-4 pointer-events-none flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="pointer-events-auto w-full max-w-lg rounded-2xl shadow-2xl p-2.5 sm:p-3.5 backdrop-blur-xl border flex items-center justify-between gap-2 sm:gap-3"
          style={{
            backgroundColor: 'var(--surface-bg)',
            borderColor: 'var(--border-color)',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.35), 0 0 25px rgba(147,51,234,0.2)',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 sm:p-2.5 rounded-xl text-white shadow-md shadow-purple-500/25 shrink-0">
              <GitCompare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="flex -space-x-2 overflow-hidden shrink-0">
                {previewProducts.map((p) => (
                  <img
                    key={p.id}
                    src={displayImageUrl(p)}
                    alt={p.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 shadow-sm"
                    style={{ borderColor: 'var(--surface-bg)' }}
                  />
                ))}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {count} {count === 1 ? 'Frame' : 'Frames'}
                </p>
                <p className="text-[10px] sm:text-xs truncate hidden xs:block" style={{ color: 'var(--text-muted)' }}>
                  Selected to compare
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={clear}
              className="p-1.5 sm:p-2 rounded-xl text-xs font-semibold hover:bg-purple-500/10 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              title="Clear compare selection"
              aria-label="Clear compare selection"
            >
              <X className="w-4 h-4" />
            </button>

            <Link
              to="/compare"
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-purple-500/25 active:scale-95 transition-all touch-manipulation cursor-pointer min-h-[38px] sm:min-h-[42px]"
            >
              <span>Compare</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
