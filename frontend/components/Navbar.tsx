'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ModeToggle } from '@/components/mode-toggle';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">
              Study Buddy
            </span>
          </Link>

          {/* Right side - minimal icons */}
          <div className="flex items-center gap-2">
            <ModeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300"
              aria-label="Toggle menu"
            >
              {/* Animated hamburger lines */}
              <span className="flex flex-col items-center justify-center w-5 h-5">
                <span
                  className={`block h-0.5 w-5 bg-white rounded-full transition-all duration-300 ease-out ${
                    isMenuOpen ? 'rotate-45 translate-y-1' : ''
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-white rounded-full mt-1.5 transition-all duration-300 ease-out ${
                    isMenuOpen ? '-rotate-45 -translate-y-0.5' : ''
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown Menu - w-fit on mobile/tablet, positioned to the right */}
      <div
        className={`absolute top-full right-0 overflow-hidden transition-all duration-500 ease-out ${
          isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mr-4 sm:mr-6 lg:mr-12 mt-2 p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10 shadow-sm  w-fit min-w-[160px] sm:min-w-[200px]">
          <div className="flex flex-col space-y-2">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/login"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium whitespace-nowrap"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 text-white bg-white/15 hover:bg-white/25 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium text-center border border-white/20 whitespace-nowrap"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium whitespace-nowrap"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium text-left whitespace-nowrap"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;