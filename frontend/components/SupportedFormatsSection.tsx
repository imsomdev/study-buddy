'use client';

import { FileText, FileCheck, File, FileSpreadsheet } from 'lucide-react';

const formats = [
  {
    icon: FileText,
    name: 'PDF Documents',
    description: 'Textbooks, research papers, lecture notes',
  },
  {
    icon: FileCheck,
    name: 'Word Documents',
    description: 'DOCX files, essays, reports',
  },
  {
    icon: File,
    name: 'Text Files',
    description: 'Plain text notes and summaries',
  },
  {
    icon: FileSpreadsheet,
    name: 'Coming Soon',
    description: 'Images, slides, and more',
  },
];

const SupportedFormatsSection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Supported Document Formats
          </h2>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
            Upload your study materials in any of these popular formats. We're constantly adding more!
          </p>
        </div>

        {/* Formats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {formats.map((format, index) => (
            <div
              key={index}
              className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 text-center hover:bg-white/10 transition-all duration-300 group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/20 transition-colors duration-300">
                <format.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                {format.name}
              </h3>
              <p className="text-xs sm:text-sm text-white/50">
                {format.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SupportedFormatsSection;
