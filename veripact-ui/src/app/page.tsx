// src/app/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <Image
        src="/Logo_Veripact.png"
        alt="Veripact Logo"
        width={384}
        height={384}
        className="mx-auto mb-8 object-contain"
      />
      <h1 className="text-4xl font-bold mb-6">Welcome to Veripact</h1>
      <Link
        href="/dashboard"
        className="inline-block bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
