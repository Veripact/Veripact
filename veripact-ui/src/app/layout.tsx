// src/app/layout.tsx

import React from "react";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import { cookieToWeb3AuthState } from "@web3auth/modal";
import { headers } from "next/headers";


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });


export const metadata = {
  title: "Veripact",
  description: "Universal trust & settlement for P2P",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const web3authInitialState = cookieToWeb3AuthState(headersList.get('cookie'));
  return (
    <html lang="en" className="dark">
      <body
        className={`
          ${geistSans.variable} ${geistMono.variable}
          antialiased
          bg-background text-foreground
          transition-colors
        `}
      >
        <Providers web3authInitialState={web3authInitialState}>
          <Navbar />
          <main className="p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
