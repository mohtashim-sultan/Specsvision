import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './components/Home'
import Shop from './components/Shop'
import Login from './components/Login'
import Signup from './components/Signup'

export default function App(){
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Header cartCount={3} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/try-on" element={<main className='py-20 min-h-[60vh] flex items-center justify-center'>Virtual Try-On (placeholder)</main>} />
        <Route path="/about" element={<main className='py-20 min-h-[60vh] flex items-center justify-center'>About (placeholder)</main>} />
        <Route path="/contact" element={<main className='py-20 min-h-[60vh] flex items-center justify-center'>Contact (placeholder)</main>} />
        <Route path="/demo" element={<main className='py-20 min-h-[60vh] flex items-center justify-center'>Demo (placeholder)</main>} />
      </Routes>
      <Footer />
    </div>
  )
}
