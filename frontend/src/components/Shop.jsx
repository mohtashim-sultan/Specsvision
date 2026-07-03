import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import ProductCard from './ProductCard';
import SearchBar from './shop/Searchbar';
import FilterDropdown from './shop/FilterDropdown';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import { fetchProducts } from '../api/productsApi';
import { toStorefrontProduct } from '../utils/storefrontProduct';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [selectedFaceShapes, setSelectedFaceShapes] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);

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

  const faceShapes = [
    { value: 'Oval', label: 'Oval' },
    { value: 'Square', label: 'Square' },
    { value: 'Round', label: 'Round' },
    { value: 'Heart', label: 'Heart' },
  ];

  // Fetch products from backend on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchProducts();
        const mapped = list.map(toStorefrontProduct);
        if (!cancelled) {
          setProducts(mapped);
          setFilteredProducts(mapped);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter and search logic
  useEffect(() => {
    setLoading(true);
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const categoryValues = selectedCategories.map((c) => c.value);
      filtered = filtered.filter((p) => p.category && categoryValues.includes(p.category));
    }

    // Brand filter
    if (selectedBrands.length > 0) {
      const brandValues = selectedBrands.map((b) => b.value);
      filtered = filtered.filter((p) => brandValues.includes(p.brand));
    }

    // Style filter
    if (selectedStyles.length > 0) {
      const styleValues = selectedStyles.map((s) => s.value);
      filtered = filtered.filter((p) => styleValues.includes(p.style));
    }

    // Face shape filter
    if (selectedFaceShapes.length > 0) {
      const shapeValues = selectedFaceShapes.map((s) => s.value);
      filtered = filtered.filter((p) =>
        p.faceShapes?.some((shape) => shapeValues.includes(shape))
      );
    }

    // Price Range filter
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

    // Badge filter
    if (selectedBadges.length > 0) {
      const badgeValues = selectedBadges.map((b) => b.value);
      filtered = filtered.filter((p) => badgeValues.includes(p.badge));
    }

    const timer = setTimeout(() => {
      setFilteredProducts(filtered);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [
    searchQuery,
    selectedCategories,
    selectedBrands,
    selectedStyles,
    selectedFaceShapes,
    selectedPriceRanges,
    selectedBadges,
    products
  ]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  return (
    <main className="py-6 sm:py-8 md:py-12 lg:py-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Shop</h2>
          <p className="text-gray-600 text-sm sm:text-base">Discover our complete collection</p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <FilterDropdown
            label="Category"
            options={categories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            multiple={true}
          />
          <FilterDropdown
            label="Brand"
            options={brands}
            selected={selectedBrands}
            onChange={setSelectedBrands}
            multiple={true}
          />
          <FilterDropdown
            label="Style"
            options={styles}
            selected={selectedStyles}
            onChange={setSelectedStyles}
            multiple={true}
          />
          <FilterDropdown
            label="Face Shape"
            options={faceShapes}
            selected={selectedFaceShapes}
            onChange={setSelectedFaceShapes}
            multiple={true}
          />
          <FilterDropdown
            label="Price"
            options={priceRanges}
            selected={selectedPriceRanges}
            onChange={setSelectedPriceRanges}
            multiple={true}
          />
          <FilterDropdown
            label="Badge"
            options={badges}
            selected={selectedBadges}
            onChange={setSelectedBadges}
            multiple={true}
          />
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="py-16 sm:py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
        ) : (
          <EmptyState
            icon={Search}
            title="No products found"
            message="Try adjusting your search or filters to find what you're looking for"
          />
        )}
      </div>
    </main>
  );
}