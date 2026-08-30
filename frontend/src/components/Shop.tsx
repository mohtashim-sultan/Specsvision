import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, WifiOff } from 'lucide-react';
import ProductCard from './ProductCard';
import SearchBar from './shop/Searchbar';
import FilterDropdown from './shop/FilterDropdown';
import CompareFloatingBar from './shop/CompareFloatingBar';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import { fetchProducts } from '../api/productsApi';
import { toStorefrontProduct } from '../utils/storefrontProduct';
import type { StorefrontProduct } from '../utils/storefrontProduct';
import type { DropdownOption } from './common/Dropdown';
import { SHAPE_GUIDE } from './ar/faceShape';

export default function Shop() {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // A failed load is not an empty catalogue. Kept apart so the page can say which
  // happened instead of blaming the user's filters for the server being unreachable.
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<DropdownOption[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<DropdownOption[]>([]);
  const [selectedFaceShapes, setSelectedFaceShapes] = useState<DropdownOption[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<DropdownOption[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<DropdownOption[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<DropdownOption[]>([]);

  // Filter options
  const categories = [
    { value: 'Aviator', label: 'Aviator' },
    { value: 'Wayfarer', label: 'Wayfarer' },
    { value: 'Round', label: 'Round' },
    { value: 'Cat-Eye', label: 'Cat-Eye' },
    { value: 'Rectangle', label: 'Rectangle' },
    { value: 'Oval', label: 'Oval' },
  ];
  const brands = [
    { value: 'SpecsVision', label: 'SpecsVision' },
    { value: 'Ray-Ban', label: 'Ray-Ban' },
    { value: 'Oakley', label: 'Oakley' },
  ];
  const styles = [
    { value: 'Classic', label: 'Classic' },
    { value: 'Sporty', label: 'Sporty' },
    { value: 'Vintage', label: 'Vintage' },
    { value: 'Modern', label: 'Modern' },
    { value: 'Retro', label: 'Retro' },
  ];
  const priceRanges = [
    { value: 'under-50', label: 'Under $50' },
    { value: '50-80', label: '$50 to $80' },
    { value: '80-100', label: '$80 to $100' },
    { value: 'over-100', label: 'Over $100' },
  ];
  const badges = [
    { value: 'Best Seller', label: 'Best Seller' },
    { value: 'New', label: 'New' },
    { value: 'Trending', label: 'Trending' },
    { value: 'Sale', label: 'Sale' },
  ];
  // Straight from SHAPE_GUIDE, so the filter always offers exactly the shapes the
  // try-on can detect. The hardcoded list here was missing Diamond and Oblong entirely,
  // so two of the six were undetectable by filter no matter what the catalogue held.
  const faceShapes = Object.keys(SHAPE_GUIDE).map((s) => ({ value: s, label: s }));

  const activeFilterCount = selectedCategories.length + selectedBadges.length + selectedFaceShapes.length + selectedBrands.length + selectedStyles.length + selectedPriceRanges.length;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const list = await fetchProducts();
        const mapped = list.map(toStorefrontProduct);
        if (!cancelled) {
          setProducts(mapped);
          setFilteredProducts(mapped);
          setLoadError(null);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
        if (!cancelled) setLoadError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    setLoading(true);
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (selectedCategories.length > 0) {
      const vals = selectedCategories.map((c) => c.value);
      filtered = filtered.filter((p) => p.category && vals.includes(p.category));
    }
    if (selectedBrands.length > 0) {
      const vals = selectedBrands.map((b) => b.value);
      filtered = filtered.filter((p) => vals.includes(p.brand));
    }
    if (selectedStyles.length > 0) {
      const vals = selectedStyles.map((s) => s.value);
      filtered = filtered.filter((p) => vals.includes(p.style));
    }
    if (selectedFaceShapes.length > 0) {
      const vals = selectedFaceShapes.map((s) => s.value);
      filtered = filtered.filter((p) => p.faceShapes?.some((shape: string) => vals.includes(shape)));
    }
    if (selectedPriceRanges.length > 0) {
      const rangeValues = selectedPriceRanges.map((r) => r.value);
      filtered = filtered.filter((p) => {
        const priceVal = Number(p.price);
        return rangeValues.some((range) => {
          if (range === 'under-50') return priceVal < 50;
          if (range === '50-80') return priceVal >= 50 && priceVal <= 80;
          if (range === '80-100') return priceVal >= 80 && priceVal <= 100;
          if (range === 'over-100') return priceVal > 100;
          return true;
        });
      });
    }
    if (selectedBadges.length > 0) {
      const vals = selectedBadges.map((b) => b.value);
      filtered = filtered.filter((p) => vals.includes(p.badge));
    }

    const timer = setTimeout(() => {
      setFilteredProducts(filtered);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategories, selectedBrands, selectedStyles, selectedFaceShapes, selectedPriceRanges, selectedBadges, products]);

  const handleSearch = (query: string) => setSearchQuery(query);

  return (
    <main className="py-6 sm:py-8 md:py-12 lg:py-16 min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-10"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Shop
              </h1>
              <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Discover our complete collection
              </p>
            </div>
            {!loading && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--surface-bg-secondary)', color: 'var(--text-muted)' }}>
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Search + Filter toggle */}
          <div className="flex gap-3">
            <SearchBar onSearch={handleSearch} className="flex-1" />
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all min-h-[44px] relative"
              style={{
                backgroundColor: filtersOpen ? 'rgba(147,51,234,0.08)' : 'var(--surface-bg)',
                border: `2px solid ${filtersOpen ? 'var(--text-accent)' : 'var(--border-color)'}`,
                color: filtersOpen ? 'var(--text-accent)' : 'var(--text-secondary)',
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Filters Panel */}
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-30 rounded-2xl p-4 sm:p-5 mb-6 shadow-md"
            style={{
              backgroundColor: 'var(--surface-bg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <FilterDropdown label="Category" options={categories} selected={selectedCategories} onChange={setSelectedCategories} />
              <FilterDropdown label="Brand" options={brands} selected={selectedBrands} onChange={setSelectedBrands} />
              <FilterDropdown label="Style" options={styles} selected={selectedStyles} onChange={setSelectedStyles} />
              <FilterDropdown label="Face Shape" options={faceShapes} selected={selectedFaceShapes} onChange={setSelectedFaceShapes} />
              <FilterDropdown label="Price" options={priceRanges} selected={selectedPriceRanges} onChange={setSelectedPriceRanges} />
              <FilterDropdown label="Badge" options={badges} selected={selectedBadges} onChange={setSelectedBadges} />
            </div>
          </motion.div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="py-16 sm:py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {filteredProducts.map((p, index) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.5) }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={WifiOff}
            title="Couldn't load the catalogue"
            message="The server didn't respond. If the site has been idle it can take up to a minute to wake up \u2014 try again in a moment."
            action={
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg active:scale-95"
              >
                Try again
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No products found"
            message="Try adjusting your search or filters to find what you're looking for"
          />
        )}
      </div>

      <CompareFloatingBar />
    </main>
  );
}