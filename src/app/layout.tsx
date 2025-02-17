import type { Metadata } from "next";
import { IBM_Plex_Mono, Varta } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const ibmPlexMono = IBM_Plex_Mono({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
});

const varta = Varta({ 
  subsets: ["latin"],
  weight: ['400'],
});

export const metadata: Metadata = {
  title: "Numena Trading Protocol",
  description: "Securities trading protocol interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${varta.className} bg-[#030a13] text-white`}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}