'use client';

import Link from 'next/link';
import { useState } from 'react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="glass fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-white">Study Buddy</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-3">
            <button className="px-4 py-2 glass-button text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-all">
              Login
            </button>
            <button className="px-4 py-2 bg-indigo-600/80 text-white text-sm font-medium rounded-lg hover:bg-indigo-600/90 transition-all backdrop-blur-sm">
              Sign Up
            </button>
          </div>
          
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-200 hover:text-white focus:outline-none hover:bg-white/10 transition-all"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1.5 sm:px-3">
            <button className="block px-3 py-2 glass-button text-white text-base font-medium rounded-lg w-full text-left hover:bg-white/20 transition-all">
              Login
            </button>
            <button className="block px-3 py-2 bg-indigo-600/80 text-white rounded-lg text-base font-medium w-full backdrop-blur-sm">
              Sign Up
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;