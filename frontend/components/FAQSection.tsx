'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What file formats are supported?',
    answer:
      "We currently support PDF, DOCX (Microsoft Word), and TXT files. We're working on adding support for more formats including images and handwritten notes.",
  },
  {
    question: 'How accurate are the generated questions?',
    answer:
      'Our AI is trained on educational content and generates highly relevant questions. Each question includes an explanation to help you understand the correct answer. The accuracy improves based on the quality and clarity of your input document.',
  },
  {
    question: 'Is my data secure and private?',
    answer:
      'Absolutely. Your documents are encrypted during upload and processing. We never share your data with third parties, and you can delete your documents at any time.',
  },
  {
    question: 'Can I share questions with my study group?',
    answer:
      'Yes! You can generate shareable links to your question sets. Your classmates can practice using the same questions without needing to upload the document again.',
  },
  {
    question: 'How many questions can I generate?',
    answer:
      "There's no limit to the number of questions you can generate. The number of questions is based on the content length and complexity of your document.",
  },
  {
    question: 'What types of questions are generated?',
    answer:
      "We primarily generate multiple-choice questions (MCQs) with 4 options each. We're expanding to include true/false, fill-in-the-blank, and short answer questions soon.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative z-10">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-base sm:text-lg text-white/70">
            Everything you need to know about Study Buddy
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-left gap-4"
              >
                <span className="text-base sm:text-lg font-medium text-white">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-white/60 shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base text-white/60 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
