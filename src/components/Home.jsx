import React from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, Play } from 'lucide-react'
import ProductCard from './ProductCard'
import { featuredProducts } from '../data'

export default function Home(){
  return (
    <main>
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">Try Before You <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Buy</span><br /><span className="text-3xl sm:text-4xl lg:text-5xl">with AI Vision</span></h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl">Experience the future of eyewear shopping with our AI-powered virtual try-on technology.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/try-on" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 flex items-center gap-2"> <Sparkles className="w-5 h-5" /> Start Virtual Try-On <ArrowRight className="w-5 h-5" /></Link>
                <Link to="/demo" className="border-2 border-purple-200 text-purple-700 px-8 py-4 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2"><Play className="w-5 h-5" /> Watch Demo</Link>
              </div>
            </div>
            <div className="relative">
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <img src="/specs.jpg" alt="Virtual Try-On Demo" className="w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Products</h2>
              <p className="text-gray-600">Handpicked frames that are perfect for you</p>
            </div>
            <Link to="/shop" className="text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-2">View All <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>
    </main>
  )
}
