import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { fetchWishlist, addToWishlist, removeFromWishlist } from "../api/wishlistApi";
import type { WishlistItem } from "../types/api";

type WishlistContextType = {
  items: WishlistItem[];
  ids: Set<number>;
  count: number;
  loading: boolean;
  isWishlisted: (productId: number) => boolean;
  toggle: (productId: number, name?: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWishlist();
      setItems(res.items);
    } catch {
      /* leave as-is */
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ids = new Set(items.map((i) => i.product.id));

  const toggle = useCallback(
    async (productId: number, name?: string) => {
      if (!isAuthenticated) {
        toast.error("Log in to save items to your wishlist");
        return;
      }
      const wasIn = items.some((i) => i.product.id === productId);
      try {
        const res = wasIn ? await removeFromWishlist(productId) : await addToWishlist(productId);
        setItems(res.items);
        toast.success(wasIn ? `Removed${name ? ` ${name}` : ""} from wishlist` : `Saved${name ? ` ${name}` : ""} to wishlist`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Wishlist update failed");
      }
    },
    [isAuthenticated, items],
  );

  return (
    <WishlistContext.Provider
      value={{ items, ids, count: items.length, loading, isWishlisted: (id) => ids.has(id), toggle, refresh }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextType {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
