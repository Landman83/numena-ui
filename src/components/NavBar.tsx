'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiSearch, FiUser, FiSettings } from 'react-icons/fi'
import { IoStatsChartOutline } from 'react-icons/io5'
import { IBM_Plex_Serif } from "next/font/google";

const ibmPlexSerif = IBM_Plex_Serif({ 
  weight: '400',
  subsets: ['latin'],
});

export default function NavBar() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <nav className="w-full bg-[#030a13]">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center">
          {/* Logo - 20px from left edge */}
          <div className="ml-[20px]">
            <Link href="/" className={`${ibmPlexSerif.className} font-normal text-xl text-white`}>
              numena.
            </Link>
          </div>

          {/* Main Navigation - 50px from end of Numena */}
          <div className="hidden md:flex items-center space-x-8 ml-[50px]">
            <Link href="/portfolio" className="text-gray-400 hover:text-white transition-colors">
              Portfolio
            </Link>
            <Link href="/trade" className="text-gray-400 hover:text-white transition-colors">
              Trade
            </Link>
            <Link href="/markets" className="text-gray-400 hover:text-white transition-colors">
              Markets
            </Link>
            <Link href="/earn" className="text-gray-400 hover:text-white transition-colors">
              Earn
            </Link>
          </div>
        </div>

        {/* Right Section - 20px from right edge */}
        <div className="flex items-center space-x-4 mr-[20px]">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[360px] px-3 py-1 rounded-lg text-sm border border-gray-800 
                       bg-[#0d1825] text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-700"
            />
            <FiSearch className="absolute right-3 top-2 text-gray-500" />
          </div>

          {/* Stats */}
          <Link href="/stats" className="text-gray-400 hover:text-white transition-colors">
            <IoStatsChartOutline className="w-5 h-5" />
          </Link>

          {/* Account */}
          <Link href="/account" className="text-gray-400 hover:text-white transition-colors">
            <FiUser className="w-5 h-5" />
          </Link>

          {/* Settings */}
          <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
            <FiSettings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  )
} 