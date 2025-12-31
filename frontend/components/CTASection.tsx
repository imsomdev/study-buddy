'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl" />
          <div className="absolute inset-0 border border-white/20 rounded-3xl" />

          {/* Content */}
          <div className="relative px-6 sm:px-10 md:px-16 py-12 sm:py-16 md:py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
              <Sparkles className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/70">
                Start learning smarter today
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              Ready to Transform Your Studies?
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8 sm:mb-10">
              Join thousands of students who are already using Study Buddy to
              ace their exams. Upload your first document now – it's free!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-teal-700 font-semibold text-base sm:text-lg hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              <Link
                href="#features"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 text-white font-medium text-base sm:text-lg hover:bg-white/20 transition-all duration-300 border border-white/20 text-center"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
