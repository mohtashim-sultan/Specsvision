import React from 'react'
import ProductCard from './ProductCard'
import { featuredProducts } from '../data'

export default function Shop(){
  const productsToShow = featuredProducts.slice(0,2)
  return (
    <main className="py-16 bg-gray-50 min-h-[60vh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Shop</h2>
          <p className="text-gray-600">Showing curated picks — 1 row, 2 frames</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {productsToShow.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </main>
  )
}
