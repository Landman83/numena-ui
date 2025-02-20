'use client'

import { useState } from 'react'
import { IBM_Plex_Serif } from "next/font/google"
import { useRouter } from 'next/navigation'
import { FiArrowRight } from 'react-icons/fi'

const ibmPlexSerif = IBM_Plex_Serif({ 
  weight: '400',
  subsets: ['latin'],
})

export default function SignUp() {
  const router = useRouter()
  const [stage, setStage] = useState<'email' | 'username' | 'password' | 'verify'>('email')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verified, setVerified] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleNextStage = () => {
    if (stage === 'email') {
      if (email !== confirmEmail) {
        setEmailError(true)
        return
      }
      setEmailError(false)
      setStage('username')
    } else if (stage === 'username') {
      setStage('password')
    } else if (stage === 'password') {
      if (password !== confirmPassword) {
        setPasswordError(true)
        return
      }
      if (password.length === 0) {
        setPasswordError(true)
        return
      }
      setPasswordError(false)
      setStage('verify')
    }
  }

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      
      const registrationData = {
        email,
        username,
        password
      };
      
      console.log('Sending registration data:', {
        ...registrationData,
        password: '[HIDDEN]'
      });

      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        const errorMessage = typeof data.detail === 'string' 
          ? data.detail 
          : 'Registration failed';
        throw new Error(errorMessage);
      }

      console.log('Registration successful:', data);
      router.push('/trade/nma');
    } catch (error) {
      console.error('Registration error:', error instanceof Error ? error.message : 'Unknown error');
      // You might want to show this error to the user
      // setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Add these helper functions to check field completion
  const isEmailStageComplete = () => {
    return email.length > 0 && confirmEmail.length > 0
  }

  const isUsernameStageComplete = () => {
    return username.length > 0
  }

  const isPasswordStageComplete = () => {
    return password.length > 0 && confirmPassword.length > 0
  }

  // Helper to determine if arrow should be shown
  const showArrow = () => {
    switch (stage) {
      case 'email':
        return isEmailStageComplete()
      case 'username':
        return isUsernameStageComplete()
      case 'password':
        return isPasswordStageComplete()
      default:
        return false
    }
  }

  // Add helper function to get stage number
  const getStageNumber = (currentStage: 'email' | 'username' | 'password' | 'verify') => {
    switch (currentStage) {
      case 'email':
        return '1/4'
      case 'username':
        return '2/4'
      case 'password':
        return '3/4'
      case 'verify':
        return '4/4'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-[#030a13]">
      {/* Logo at top center */}
      <div className="absolute top-[25px] left-1/2 -translate-x-1/2">
        <button 
          onClick={() => router.push('/signin')}
          className={`${ibmPlexSerif.className} font-normal text-3xl text-white hover:text-gray-300 transition-colors`}
        >
          numena.
        </button>
      </div>

      {/* Sign Up Container centered */}
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="relative w-[400px]">
          <div className="w-full bg-[#050d17] rounded-lg shadow-md p-6 border border-gray-900">
            {/* Title with stage indicator */}
            <div className="flex items-center gap-3 mb-6">
              <h1 className="text-xl text-white font-semibold">Sign Up</h1>
              <span className="text-xl text-gray-500 font-light">
                {getStageNumber(stage)}
              </span>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {stage === 'email' && (
                <>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                               bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Confirm Email Address
                    </label>
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                               bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                      placeholder="Confirm your email"
                    />
                  </div>
                  {emailError && (
                    <div className="text-red-500 text-sm">
                      Email addresses must match
                    </div>
                  )}
                </>
              )}

              {stage === 'username' && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                             bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                    placeholder="Choose a username"
                  />
                </div>
              )}

              {stage === 'password' && (
                <>
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
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-gray-800 
                               bg-[#0d1825] text-white focus:outline-none focus:ring-1 focus:ring-gray-700"
                      placeholder="Confirm your password"
                    />
                  </div>
                  {passwordError && (
                    <div className="text-red-500 text-sm">
                      Passwords must match
                    </div>
                  )}
                </>
              )}

              {stage === 'verify' && (
                <>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-2 text-gray-400 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={verified}
                        onChange={(e) => setVerified(e.target.checked)}
                        className="rounded border-gray-800 bg-[#0d1825] text-blue-600 
                                 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span>Rankin said I could test the platform</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Register button */}
          {stage === 'verify' && verified && (
            <div className="absolute -bottom-16 inset-x-0">
              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full py-2 rounded-lg font-semibold text-white 
                         bg-blue-600 hover:bg-blue-700 transition-colors
                         disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </div>
          )}

          {/* Arrow */}
          {stage !== 'verify' && showArrow() && (
            <div className="absolute -bottom-16 inset-x-0">
              <button
                onClick={handleNextStage}
                className="w-full flex items-center justify-center text-blue-400 
                         hover:text-blue-300 transition-colors"
              >
                <FiArrowRight className="w-8 h-8" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
