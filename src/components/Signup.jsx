import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Signup(){
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password) return setError('All fields required')
    // TODO: send to backend
    console.log('signup', { name, email, password })
    navigate('/login')
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Create your account</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-3 rounded-lg border" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full mt-1 p-3 rounded-lg border" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full mt-1 p-3 rounded-lg border" placeholder="Create a password" />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center justify-between">
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold">Sign up</button>
            <Link to="/login" className="text-sm text-purple-600 hover:underline">Have an account?</Link>
          </div>
        </form>
      </div>
    </main>
  )
}
