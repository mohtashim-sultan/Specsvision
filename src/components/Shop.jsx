import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import ProductCard from './ProductCard';
import { featuredProducts } from '../data';
import SearchBar from './shop/Searchbar';
import FilterDropdown from './shop/FilterDropdown';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';

export default function Shop() {
  const [products, setProducts] = useState(featuredProducts);
  const [filteredProducts, setFilteredProducts] = useState(featuredProducts);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [selectedFaceShapes, setSelectedFaceShapes] = useState([]);

  // Filter options
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'aviator', label: 'Aviator' },
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'cat-eye', label: 'Cat Eye' },
    { value: 'sporty', label: 'Sporty' },
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

  // Extract unique face shapes from products
  useEffect(() => {
    const allFaceShapes = featuredProducts.flatMap((p) => p.faceShapes || []);
    // You can use this to dynamically generate face shape options
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

    // Badge filter
    if (selectedBadges.length > 0) {
      const badgeValues = selectedBadges.map((b) => b.value);
      filtered = filtered.filter((p) => badgeValues.includes(p.badge));
    }

    // Face shape filter
    if (selectedFaceShapes.length > 0) {
      const shapeValues = selectedFaceShapes.map((s) => s.value);
      filtered = filtered.filter((p) =>
        p.faceShapes?.some((shape) => shapeValues.includes(shape))
      );
    }

    setTimeout(() => {
      setFilteredProducts(filtered);
      setLoading(false);
    }, 300);
  }, [searchQuery, selectedBadges, selectedFaceShapes, products]);

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

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <FilterDropdown
            label="Badge"
            options={badges}
            selected={selectedBadges}
            onChange={setSelectedBadges}
            multiple={true}
          />
          <FilterDropdown
            label="Face Shape"
            options={faceShapes}
            selected={selectedFaceShapes}
            onChange={setSelectedFaceShapes}
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
                transition={{ delay: index * 0.05 }}
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