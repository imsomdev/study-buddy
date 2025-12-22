'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { API_ENDPOINTS } from '@/lib/api';
import { ArrowLeft, RotateCw, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

type Flashcard = {
  id: number;
  front: string;
  back: string;
  explanation: string;
};

export default function FlashcardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const storedFilename = sessionStorage.getItem('currentFlashcardDoc');
    if (!storedFilename) {
      router.push('/dashboard');
      return;
    }
    setFilename(storedFilename);

    const fetchCards = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.generateFlashcards(storedFilename), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setCards(data.flashcards);
        } else {
          setError('Failed to load flashcards. Please try again.');
        }
      } catch (err) {
        console.error("Error fetching flashcards:", err);
        setError('An error occurred while loading flashcards.');
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [router]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        </div>
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center text-white">
          <div className="glass-card p-8 rounded-2xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
            <p className="animate-pulse text-white/80">Generating your study deck...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || cards.length === 0) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        </div>
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center text-white">
          <div className="glass-card p-8 rounded-2xl text-center">
            <p className="text-red-300 mb-4">{error || "No flashcards available for this document."}</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 glass-btn hover:bg-white/20 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Teal gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        {/* Decorative floating circles */}
        <div className="hidden sm:block absolute top-20 right-10 md:right-20 w-16 md:w-20 h-16 md:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 opacity-80 animate-float shadow-lg" />
        <div className="hidden sm:block absolute top-40 right-24 md:right-32 w-6 md:w-8 h-6 md:h-8 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-400 opacity-70 animate-float-delayed" />
        <div className="hidden md:block absolute bottom-32 left-20 w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 opacity-60 animate-float" />
      </div>

      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-center pt-20 px-4">
        {/* Header */}
        <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} /> <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2 glass-btn px-4 py-1.5 rounded-full">
            <BookOpen size={16} className="text-cyan-200" />
            <span className="text-sm font-medium text-white truncate max-w-[200px]">{filename}</span>
          </div>
        </div>

        {/* Flashcard Area */}
        <div className="relative w-full max-w-2xl aspect-[3/2] perspective-1000 mb-8 cursor-pointer group" onClick={handleFlip}>
          <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front */}
            <div className="absolute inset-0 backface-hidden glass-panel p-8 sm:p-12 flex flex-col items-center justify-center text-center group-hover:scale-[1.02] transition-all">
              <span className="absolute top-6 left-6 text-xs uppercase tracking-widest text-white/50 font-bold">Question</span>
              <h3 className="text-xl sm:text-3xl font-bold text-white leading-relaxed">
                {currentCard.front}
              </h3>
              <p className="absolute bottom-6 text-white/50 text-sm flex items-center gap-2">
                <RotateCw size={14} /> Click to flip
              </p>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 glass-panel bg-white/10 p-8 sm:p-12 flex flex-col items-center justify-center text-center">
              <span className="absolute top-6 left-6 text-xs uppercase tracking-widest text-cyan-200 font-bold">Answer</span>
              <p className="text-lg sm:text-2xl font-medium text-white/90 leading-relaxed">
                {currentCard.back}
              </p>
              {currentCard.explanation && (
                <div className="mt-6 p-4 bg-black/20 rounded-xl text-sm text-white/80 max-h-[100px] overflow-y-auto w-full">
                  <span className="font-semibold text-cyan-200 block mb-1">Explanation:</span>
                  {currentCard.explanation}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8 mb-12">
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            disabled={currentIndex === 0}
            className="p-4 rounded-full glass-btn hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-lg font-mono text-white/70">
            {currentIndex + 1} / {cards.length}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            disabled={currentIndex === cards.length - 1}
            className="p-4 rounded-full glass-btn hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </div>

      </main>
      
      <Footer />
      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
