'use client'

import { IBM_Plex_Mono, Varta } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/contexts/AuthContext';

const ibmPlexMono = IBM_Plex_Mono({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
});

const varta = Varta({ 
  subsets: ["latin"],
  weight: ['400'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const hideNavbar = pathname === '/signin' || pathname === '/signup'

  return (
    <html lang="en" className="dark">
      <body className={`${varta.className} bg-[#030a13] text-white`}>
        <AuthProvider>
          {!hideNavbar && <NavBar />}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}