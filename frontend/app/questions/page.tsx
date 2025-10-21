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
  page_number?: number;
};

type MCQGenerationResponse = {
  filename: string;
  page_count: number;
  questions: Question[];
  message: string;
};

type AnswerValidationResponse = {
  question_id: number;
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  choices: Choice[];
  question: string;
};

const QuestionsPage = () => {
  const router = useRouter();
  const [questionsData, setQuestionsData] = useState<MCQGenerationResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    // Try to get current question index from session storage
    if (typeof window !== 'undefined') {
      const savedIndex = sessionStorage.getItem('currentQuestionIndex');
      return savedIndex ? parseInt(savedIndex, 10) : 0;
    }
    return 0;
  });
  const [selectedChoice, setSelectedChoice] = useState<string | null>(() => {
    // Try to get selected choice from session storage
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('selectedChoice');
    }
    return null;
  });
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(() => {
    // Try to get answer submission status from session storage
    if (typeof window !== 'undefined') {
      const savedStatus = sessionStorage.getItem('isAnswerSubmitted');
      return savedStatus === 'true';
    }
    return false;
  });
  const [isCorrect, setIsCorrect] = useState<boolean | null>(() => {
    // Try to get correctness status from session storage
    if (typeof window !== 'undefined') {
      const savedStatus = sessionStorage.getItem('isCorrect');
      return savedStatus !== null ? savedStatus === 'true' : null;
    }
    return null;
  });
  const [validationResult, setValidationResult] = useState<AnswerValidationResponse | null>(() => {
    // Try to get validation result from session storage
    if (typeof window !== 'undefined') {
      const savedResult = sessionStorage.getItem('validationResult');
      return savedResult ? JSON.parse(savedResult) : null;
    }
    return null;
  });
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the questions data from sessionStorage or localStorage
    const storedData = sessionStorage.getItem('generatedQuestions');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData) as MCQGenerationResponse;
        setQuestionsData(parsedData);
        setTotalQuestions(parsedData.questions.length);
        setLoading(false);
      } catch (e) {
        setError('Failed to load questions data');
        console.error('Error parsing questions data:', e);
        setLoading(false);
      }
    } else {
      // Redirect back to home if no data found
      router.push('/');
    }
  }, [router]);

  // Fetch total question count from backend
  useEffect(() => {
    if (questionsData?.filename) {
      const fetchQuestionCount = async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/v1/mcq-question-count/${encodeURIComponent(questionsData.filename)}`);
          if (response.ok) {
            const count: number = await response.json();
            setTotalQuestions(count);
          } else {
            throw new Error(`Failed to get question count: ${response.status} ${response.statusText}`);
          }
        } catch (err) {
          console.error('Error fetching question count:', err);
          // Fallback to using the length from session storage if API fails
          if (questionsData.questions && questionsData.questions.length > 0) {
            setTotalQuestions(questionsData.questions.length);
          }
        }
      };
      
      fetchQuestionCount();
    }
  }, [questionsData]);

  // Handle fetching a specific question when the index changes
  useEffect(() => {
    if (questionsData?.filename && currentQuestionIndex >= 0) {
      const fetchQuestion = async () => {
        setQuestionsLoading(true);
        try {
          const response = await fetch(`http://localhost:8000/api/v1/mcq-questions/${encodeURIComponent(questionsData.filename)}/${currentQuestionIndex}`);
          if (response.ok) {
            const question = await response.json();
            // Update the questions array with the fetched question at the current index
            setQuestionsData(prevData => {
              if (!prevData) return null;
              const updatedQuestions = [...prevData.questions];
              if (updatedQuestions.length > currentQuestionIndex) {
                updatedQuestions[currentQuestionIndex] = question;
              } else {
                // If the array is shorter, fill in with previous questions and add the new one
                while (updatedQuestions.length < currentQuestionIndex) {
                  updatedQuestions.push(prevData.questions[updatedQuestions.length]);
                }
                updatedQuestions.push(question);
              }
              return {
                ...prevData,
                questions: updatedQuestions
              };
            });
          } else {
            throw new Error(`Failed to get question: ${response.status} ${response.statusText}`);
          }
        } catch (err) {
          console.error('Error fetching question:', err);
          setError('Failed to load question');
        } finally {
          setQuestionsLoading(false);
          // Reset states when changing questions
          setSelectedChoice(null);
          setIsAnswerSubmitted(false);
          setIsCorrect(null);
          setValidationResult(null);
        }
      };
      
      fetchQuestion();
    }
  }, [currentQuestionIndex, questionsData?.filename]); // Only re-run when currentQuestionIndex or filename changes

  // Save state to session storage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('currentQuestionIndex', currentQuestionIndex.toString());
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (selectedChoice !== null) {
      sessionStorage.setItem('selectedChoice', selectedChoice);
    } else {
      sessionStorage.removeItem('selectedChoice');
    }
  }, [selectedChoice]);

  useEffect(() => {
    sessionStorage.setItem('isAnswerSubmitted', isAnswerSubmitted.toString());
  }, [isAnswerSubmitted]);

  useEffect(() => {
    if (isCorrect !== null) {
      sessionStorage.setItem('isCorrect', isCorrect.toString());
    } else {
      sessionStorage.removeItem('isCorrect');
    }
  }, [isCorrect]);

  useEffect(() => {
    if (validationResult) {
      sessionStorage.setItem('validationResult', JSON.stringify(validationResult));
    } else {
      sessionStorage.removeItem('validationResult');
    }
  }, [validationResult]);

  const handleChoiceSelect = (choiceId: string) => {
    if (!isAnswerSubmitted) {
      setSelectedChoice(choiceId);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedChoice || !questionsData?.questions[currentQuestionIndex]) return;

    try {
      const response = await fetch('http://localhost:8000/api/v1/validate-answer/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: questionsData.questions[currentQuestionIndex].id,
          selected_choice: selectedChoice,
        }),
      });

      if (response.ok) {
        const result: AnswerValidationResponse = await response.json();
        setValidationResult(result);
        setIsCorrect(result.is_correct);
        setIsAnswerSubmitted(true);
      } else {
        setError(`Failed to validate answer: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setError('Error validating answer');
      console.error('Error validating answer:', err);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

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

  if (!questionsData || questionsData.questions.length === 0) {
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

  const currentQuestion = questionsData.questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading Question...</h2>
            <div className="w-16 h-16 border-t-4 border-indigo-600 border-solid rounded-full animate-spin mx-auto"></div>
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
            <p className="text-gray-500 mt-2">
              Generated from {questionsData.filename} ({questionsData.page_count} pages)
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </h2>
              <button
                onClick={handleBackToUpload}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Upload Another File
              </button>
            </div>

            {questionsLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-16 h-16 border-t-4 border-indigo-600 border-solid rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {currentQuestion.question}
                  </h3>
                </div>
                
                <div className="space-y-3 mb-6">
                  {currentQuestion.choices.map((choice) => (
                    <div 
                      key={choice.id}
                      onClick={() => handleChoiceSelect(choice.id)}
                      className={`flex items-start p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedChoice === choice.id
                          ? isAnswerSubmitted
                            ? choice.id === currentQuestion.correct_answer
                              ? 'bg-green-100 border-2 border-green-500'
                              : 'bg-red-100 border-2 border-red-500'
                            : 'bg-indigo-100 border-2 border-indigo-500'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span 
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                          selectedChoice === choice.id
                            ? isAnswerSubmitted
                              ? choice.id === currentQuestion.correct_answer
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                              : 'bg-indigo-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {choice.id}
                      </span>
                      <span className="text-gray-700 flex-grow">
                        {choice.text}
                      </span>
                    </div>
                  ))}
                </div>

                {!isAnswerSubmitted ? (
                  <div className="flex justify-center">
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedChoice}
                      className={`px-6 py-3 font-medium rounded-lg transition-colors ${
                        selectedChoice
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Check Answer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${
                      isCorrect ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
                    }`}>
                      <p className="font-medium">
                        {isCorrect ? '✓ Correct!' : '✗ Incorrect!'}
                      </p>
                      {!isCorrect && (
                        <p className="mt-2">
                          <span className="font-medium">Correct answer:</span> {currentQuestion.choices.find(c => c.id === currentQuestion.correct_answer)?.text}
                        </p>
                      )}
                    </div>
                    
                    {validationResult?.explanation && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-800">Explanation:</p>
                        <p className="mt-1 text-gray-700">{validationResult.explanation}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between mt-6">
                      <button
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className={`px-4 py-2 rounded-lg ${
                          currentQuestionIndex === 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Previous
                      </button>
                      
                      <button
                        onClick={handleNextQuestion}
                        disabled={currentQuestionIndex === totalQuestions - 1}
                        className={`px-4 py-2 rounded-lg ${
                          currentQuestionIndex === totalQuestions - 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        Next Question
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={handleBackToUpload}
              className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
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