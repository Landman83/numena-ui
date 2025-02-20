'use client'

import { useState } from 'react'
import { IBM_Plex_Serif } from "next/font/google"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

const ibmPlexSerif = IBM_Plex_Serif({ 
  weight: '400',
  subsets: ['latin'],
})

// Add API client function
const loginUser = async (credentials: {
  username: string;
  password: string;
}) => {
  try {
    // Create FormData object
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export default function SignIn() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Update handleSignIn function
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); // Important: prevent form submission
    
    try {
      setError('');
      setIsLoading(true);
      
      console.log('Attempting login with:', {
        username: identifier,
        password: '[HIDDEN]'
      });

      const formData = new URLSearchParams();
      formData.append('username', identifier);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      login(data.access_token);
      router.push('/trade/nma');
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

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
            <form 
              onSubmit={handleSignIn} 
              className="space-y-4"
              noValidate // Add this to prevent browser validation
            >
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                           bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>

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
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading || !identifier || !password}
                className="w-full py-2 rounded-lg font-semibold text-white bg-blue-600 
                         hover:bg-blue-700 transition-colors disabled:bg-blue-400 
                         disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
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
