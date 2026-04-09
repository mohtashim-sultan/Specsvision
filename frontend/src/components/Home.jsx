import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Play } from 'lucide-react';
import ProductCard from './ProductCard';
import { featuredProducts } from '../data';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-10 sm:py-12 md:py-16 lg:py-20 xl:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left order-2 lg:order-1"
            >
              <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
                Try Before You{' '}
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Buy
                </span>
                <br />
                <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
                  with AI Vision
                </span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0 px-2 sm:px-0">
                Experience the future of eyewear shopping with our AI-powered virtual try-on
                technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start px-2 sm:px-0">
                <Link
                  to="/try-on"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 sm:px-6 md:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:shadow-xl active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Start Virtual Try-On</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                </Link>
                <Link
                  to="/demo"
                  className="border-2 border-purple-200 text-purple-700 px-5 sm:px-6 md:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-purple-50 active:bg-purple-100 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Watch Demo</span>
                </Link>
              </div>
            </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative order-1 lg:order-2"
            >
              <div className="relative bg-white rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl p-3 sm:p-4 md:p-6 lg:p-8 transform rotate-0 sm:rotate-2 md:rotate-3 hover:rotate-0 transition-transform duration-500">
                <img
                  src="/specs.jpg"
                  alt="Virtual Try-On Demo"
                  className="w-full rounded-lg sm:rounded-xl md:rounded-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Featured Products
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Handpicked frames that are perfect for you
              </p>
            </div>
            <Link
              to="/shop"
              className="text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-2 text-sm sm:text-base"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((p, index) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
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