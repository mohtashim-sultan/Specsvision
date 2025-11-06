import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Login(){
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) return setError('Please fill both fields')
    // TODO: replace with real API call
    console.log('login', { email, password })
    navigate('/')
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Login to SpecsVision</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full mt-1 p-3 rounded-lg border" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full mt-1 p-3 rounded-lg border" placeholder="••••••" />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center justify-between">
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold">Login</button>
            <Link to="/signup" className="text-sm text-purple-600 hover:underline">Create account</Link>
          </div>
        </form>
      </div>
    </main>
  )
}
