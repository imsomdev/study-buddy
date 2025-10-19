'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Define the question type based on the schema
type Choice = {
  id: string;
  text: string;
};

type Question = {
  id: number;
  question: string;
  choices: Choice[];
  correct_answer: string;
  explanation?: string;
};

type MCQGenerationResponse = {
  filename: string;
  page_count: number;
  questions: Question[];
  message: string;
};

const QuestionsPage = () => {
  const router = useRouter();
  const [questionsData, setQuestionsData] = useState<MCQGenerationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the questions data from sessionStorage or localStorage
    const storedData = sessionStorage.getItem('generatedQuestions');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData) as MCQGenerationResponse;
        setQuestionsData(parsedData);
      } catch (e) {
        setError('Failed to load questions data');
        console.error('Error parsing questions data:', e);
      }
    } else {
      // Redirect back to home if no data found
      router.push('/');
    }
    setLoading(false);
  }, [router]);

  const handleBackToUpload = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-t-4 border-indigo-600 border-solid rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading your questions...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Questions</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleBackToUpload}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Upload
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!questionsData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Questions Found</h2>
            <p className="text-gray-600 mb-6">Please generate questions first.</p>
            <button
              onClick={handleBackToUpload}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Upload
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <Navbar />
      
      <main className="flex-grow py-12 relative z-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Learning Journey</h1>
            <p className="text-lg text-gray-600">{questionsData.message}</p>
            <p className="text-gray-500 mt-2">Generated from {questionsData.filename} ({questionsData.page_count} pages)</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Generated Questions</h2>
              <button
                onClick={handleBackToUpload}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Upload Another File
              </button>
            </div>

            <div className="space-y-8">
              {questionsData.questions.map((q, index) => (
                <div key={q.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Question {index + 1}: {q.question}
                    </h3>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {q.choices.map((choice) => (
                      <div 
                        key={choice.id} 
                        className={`flex items-start p-3 rounded-lg transition-colors ${
                          q.correct_answer === choice.id 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <span 
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                            q.correct_answer === choice.id 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {choice.id}
                        </span>
                        <span className={`text-gray-700 ${
                          q.correct_answer === choice.id ? 'font-medium' : ''
                        }`}>
                          {choice.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-indigo-600">
                      Correct Answer: {q.choices.find(choice => choice.id === q.correct_answer)?.text}
                    </p>
                    {q.explanation && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Explanation:</span> {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleBackToUpload}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default QuestionsPage;