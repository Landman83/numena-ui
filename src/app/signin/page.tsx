'use client'

import { useState } from 'react'
import { IBM_Plex_Serif } from "next/font/google"
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ibmPlexSerif = IBM_Plex_Serif({ 
  weight: '400',
  subsets: ['latin'],
})

export default function SignIn() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/trade/nma')
  }

  return (
    <div className="min-h-screen bg-[#030a13]">
      {/* Logo fixed at top */}
      <div className="absolute top-[230px] left-1/2 -translate-x-1/2">
        <span className={`${ibmPlexSerif.className} font-normal text-3xl text-white`}>
          numena.
        </span>
      </div>

      {/* Sign In Container centered */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-[400px]">
          <div className="w-full bg-[#050d17] rounded-lg shadow-md p-6 border border-gray-900">
            {/* Title */}
            <h1 className="text-xl text-white font-semibold mb-6">Sign In</h1>

            {/* Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email/Username Field */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Email or Username
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                           bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                  placeholder="Enter your email or username"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                           bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                  placeholder="Enter your password"
                />
              </div>

              {/* Sign In Button */}
              <button 
                type="submit"
                className="w-full py-2 rounded-lg font-semibold text-white bg-blue-600 
                         hover:bg-blue-700 transition-colors mt-6"
              >
                Sign In
              </button>
            </form>

            {/* Register Link */}
            <div className="text-center mt-6">
              <span className="text-gray-400 text-sm">Don't have an account? </span>
              <Link 
                href="/signup"
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
