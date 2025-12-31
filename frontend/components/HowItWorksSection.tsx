'use client';

import { Upload, Sparkles, CheckCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload Your Document',
    description:
      'Drag and drop your PDF, DOCX, or TXT file. Our system accepts study notes, textbooks, articles, and more.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'AI Generates Questions',
    description:
      'Our AI analyzes your content and creates relevant multiple-choice questions, with explanations for each answer.',
  },
  {
    number: '03',
    icon: CheckCircle,
    title: 'Practice & Improve',
    description:
      'Take practice tests, review your answers, and track your progress. Master any subject with personalized learning.',
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            How Study Buddy Works
          </h2>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
            Three simple steps to transform your study materials into
            interactive practice tests.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line (hidden on mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-white/20 to-transparent" />
              )}

              <div className="text-center group">
                {/* Step Number */}
                <div className="text-5xl sm:text-6xl font-bold text-white/10 mb-4">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/15 flex items-center justify-center mx-auto mb-6 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-500">
                  <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white/80" />
                </div>

                {/* Content */}
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
