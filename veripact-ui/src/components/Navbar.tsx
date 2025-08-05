// veripact-ui/src/components/Navbar.tsx

'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import LogoutButton from './LogoutButton';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // only show theme toggle once mounted (no SSR mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="w-full bg-gray-100 dark:bg-gray-900 p-4 flex justify-between items-center">
      <div className="font-bold text-gray-800 dark:text-gray-100">Veripact</div>
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard"
          className="text-gray-700 dark:text-gray-200 hover:underline"
        >
          Dashboard
        </Link>
        <Link
          href="/profile"
          className="text-gray-700 dark:text-gray-200 hover:underline"
        >
          Profile
        </Link>
        <Link
          href="/verifications"
          className="text-gray-700 dark:text-gray-200 hover:underline"
        >
          Verifications
        </Link>

        {/* theme switcher */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded"
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        )}

        <LogoutButton/>
      </div>
    </nav>
  );
}
