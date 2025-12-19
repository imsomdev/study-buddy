'use client';

import { FileText, Brain, BarChart3, Shield, Zap, Users } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Upload Any Document',
    description: 'Support for PDF, DOCX, and TXT files. Simply drag and drop your study materials and we\'ll handle the rest.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Questions',
    description: 'Our advanced AI analyzes your content and generates relevant MCQs, short answers, and comprehension questions.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Track your progress with detailed analytics. See which topics need more attention and improve your scores.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your documents are encrypted and processed securely. We never share your data with third parties.',
  },
  {
    icon: Zap,
    title: 'Instant Generation',
    description: 'Get your practice questions in seconds, not hours. Save time and focus on what matters - learning.',
  },
  {
    icon: Users,
    title: 'Collaborative Learning',
    description: 'Share question sets with classmates and study groups. Learn together, achieve together.',
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Smart Study Tools for Everyone
          </h2>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
            Transform your study materials into interactive practice tests. Our platform makes learning efficient and effective.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 sm:p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex items-center justify-center mb-5 group-hover:bg-white/20 transition-colors duration-300">
                <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
