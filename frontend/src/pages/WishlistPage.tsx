import React from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import ProductCard from "../components/ProductCard";
import { toStorefrontProduct } from "../utils/storefrontProduct";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function WishlistPage() {
  const { isAuthenticated } = useAuth();
  const { items, loading } = useWishlist();

  if (!isAuthenticated) {
    return (
      <main className="py-20 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: "rgba(236,72,153,0.08)" }}>
          <Heart className="w-8 h-8" style={{ color: "#ec4899" }} />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Your Wishlist</h1>
        <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Log in to save and view your favorite frames.</p>
        <Link to="/login" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold">Log In</Link>
      </main>
    );
  }

  return (
    <main className="py-6 sm:py-8 md:py-12 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Heart className="w-7 h-7 fill-current" style={{ color: "#ec4899" }} /> Your Wishlist
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{items.length} saved frame{items.length === 1 ? "" : "s"}.</p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(147,51,234,0.06)" }}>
              <ShoppingBag className="w-10 h-10" style={{ color: "var(--text-accent)" }} />
            </div>
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>No saved frames yet</h3>
            <p className="text-sm max-w-sm mt-1 mb-6" style={{ color: "var(--text-muted)" }}>Tap the heart on any product to save it here.</p>
            <Link to="/shop" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">Browse Shop</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((it) => (
              <ProductCard key={it.id} product={toStorefrontProduct(it.product)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
