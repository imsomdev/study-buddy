'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { API_ENDPOINTS } from '@/lib/api';
import {
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  RotateCcw,
  Home,
} from 'lucide-react';

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
  documentId?: number;
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

type QuizResult = {
  questionId: number;
  isCorrect: boolean;
  selectedChoice: string;
};

const QuestionsPage = () => {
  const router = useRouter();
  const [questionsData, setQuestionsData] =
    useState<MCQGenerationResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [validationResult, setValidationResult] =
    useState<AnswerValidationResponse | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz tracking state
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [documentId, setDocumentId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const storedData = sessionStorage.getItem('generatedQuestions');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData) as MCQGenerationResponse;
        setQuestionsData(parsedData);
        setTotalQuestions(parsedData.questions.length);
        if (parsedData.documentId) {
          setDocumentId(parsedData.documentId);
        }
        setLoading(false);
      } catch (e) {
        setError('Failed to load questions data');
        console.error('Error parsing questions data:', e);
        setLoading(false);
      }
    } else {
      router.push('/');
    }
  }, [router]);

  // Fetch total question count from backend
  useEffect(() => {
    if (questionsData?.filename) {
      const fetchQuestionCount = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            API_ENDPOINTS.mcqQuestionCount(questionsData.filename),
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          if (response.ok) {
            const count: number = await response.json();
            setTotalQuestions(count);
          }
        } catch (err) {
          console.error('Error fetching question count:', err);
        }
      };

      fetchQuestionCount();
    }
  }, [questionsData]);

  // Fetch document ID if not provided
  useEffect(() => {
    if (questionsData?.filename && !documentId) {
      const fetchDocumentId = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(API_ENDPOINTS.documents, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (response.ok) {
            const docs = await response.json();
            const doc = docs.find(
              (d: any) => d.filename === questionsData.filename
            );
            if (doc) {
              setDocumentId(doc.id);
            }
          }
        } catch (err) {
          console.error('Error fetching document ID:', err);
        }
      };

      fetchDocumentId();
    }
  }, [questionsData, documentId]);

  // Handle fetching a specific question when the index changes
  useEffect(() => {
    if (
      questionsData?.filename &&
      currentQuestionIndex >= 0 &&
      !isQuizComplete
    ) {
      const fetchQuestion = async () => {
        setQuestionsLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            API_ENDPOINTS.mcqQuestions(
              questionsData.filename,
              currentQuestionIndex
            ),
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          if (response.ok) {
            const question = await response.json();
            setQuestionsData(prevData => {
              if (!prevData) return null;
              const updatedQuestions = [...prevData.questions];
              if (updatedQuestions.length > currentQuestionIndex) {
                updatedQuestions[currentQuestionIndex] = question;
              } else {
                while (updatedQuestions.length < currentQuestionIndex) {
                  updatedQuestions.push(
                    prevData.questions[updatedQuestions.length]
                  );
                }
                updatedQuestions.push(question);
              }
              return { ...prevData, questions: updatedQuestions };
            });
          }
        } catch (err) {
          console.error('Error fetching question:', err);
          setError('Failed to load question');
        } finally {
          setQuestionsLoading(false);
          // Reset answer state for new question
          setSelectedChoice(null);
          setIsAnswerSubmitted(false);
          setIsCorrect(null);
          setValidationResult(null);
        }
      };

      fetchQuestion();
    }
  }, [currentQuestionIndex, questionsData?.filename, isQuizComplete]);

  const handleChoiceSelect = (choiceId: string) => {
    if (!isAnswerSubmitted) {
      setSelectedChoice(choiceId);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedChoice || !questionsData?.questions[currentQuestionIndex])
      return;

    const currentQuestion = questionsData.questions[currentQuestionIndex];

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.validateAnswer, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_choice: selectedChoice,
        }),
      });

      if (response.ok) {
        const result: AnswerValidationResponse = await response.json();
        setValidationResult(result);
        setIsCorrect(result.is_correct);
        setIsAnswerSubmitted(true);

        // Track result locally
        setQuizResults(prev => [
          ...prev,
          {
            questionId: currentQuestion.id,
            isCorrect: result.is_correct,
            selectedChoice: selectedChoice,
          },
        ]);

        // Record progress to backend
        if (documentId && token) {
          try {
            await fetch(API_ENDPOINTS.progressRecord, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                document_id: documentId,
                question_id: currentQuestion.id,
                selected_choice: selectedChoice,
                is_correct: result.is_correct,
              }),
            });
          } catch (progressError) {
            console.error('Error recording progress:', progressError);
          }
        }
      } else {
        setError(`Failed to validate answer: ${response.status}`);
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

  const handleFinishQuiz = () => {
    setIsQuizComplete(true);
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setQuizResults([]);
    setIsQuizComplete(false);
    setSelectedChoice(null);
    setIsAnswerSubmitted(false);
    setIsCorrect(null);
    setValidationResult(null);
  };

  const handleBackToDashboard = () => {
    // Clear session storage
    sessionStorage.removeItem('generatedQuestions');
    router.push('/dashboard');
  };

  // Calculate quiz statistics
  const correctCount = quizResults.filter(r => r.isCorrect).length;
  const incorrectCount = quizResults.filter(r => !r.isCorrect).length;
  const accuracy =
    quizResults.length > 0
      ? Math.round((correctCount / quizResults.length) * 100)
      : 0;

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        </div>
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center glass-card p-6 rounded-xl">
            <div className="w-12 h-12 border-t-4 border-white border-solid rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-base text-white/80">
              Loading your questions...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        </div>
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center glass-card p-6 rounded-xl max-w-sm">
            <h2 className="text-xl font-bold text-red-300 mb-3">Error</h2>
            <p className="text-white/80 mb-4">{error}</p>
            <button
              onClick={handleBackToDashboard}
              className="px-5 py-2 glass-btn text-white font-medium rounded-xl"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!questionsData || totalQuestions === 0) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        </div>
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center glass-card p-6 rounded-xl max-w-sm">
            <h2 className="text-xl font-bold text-white mb-3">
              No Questions Found
            </h2>
            <p className="text-white/80 mb-4">
              Please generate questions first.
            </p>
            <button
              onClick={handleBackToDashboard}
              className="px-5 py-2 glass-btn text-white font-medium rounded-xl"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Quiz Complete Screen
  if (isQuizComplete) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
          <div className="hidden sm:block absolute top-20 right-10 w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 opacity-80 animate-float shadow-lg" />
          <div className="hidden md:block absolute bottom-32 left-20 w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 opacity-60 animate-float-delayed" />
        </div>

        <Navbar />

        <main className="flex-grow pt-16 pb-12 relative z-10">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="glass-card p-8 text-center">
              {/* Trophy Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Trophy size={40} className="text-white" />
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">
                Quiz Complete!
              </h1>
              <p className="text-white/70 mb-8">
                Great job finishing the quiz for {questionsData.filename}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="glass-panel p-4 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target size={20} className="text-cyan-300" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {quizResults.length}
                  </p>
                  <p className="text-sm text-white/60">Answered</p>
                </div>

                <div className="glass-panel p-4 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle size={20} className="text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-green-400">
                    {correctCount}
                  </p>
                  <p className="text-sm text-white/60">Correct</p>
                </div>

                <div className="glass-panel p-4 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <XCircle size={20} className="text-red-400" />
                  </div>
                  <p className="text-3xl font-bold text-red-400">
                    {incorrectCount}
                  </p>
                  <p className="text-sm text-white/60">Incorrect</p>
                </div>
              </div>

              {/* Accuracy */}
              <div className="glass-panel p-6 rounded-xl mb-8">
                <p className="text-sm text-white/60 mb-2">Your Accuracy</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke={
                          accuracy >= 70
                            ? '#22c55e'
                            : accuracy >= 40
                              ? '#eab308'
                              : '#ef4444'
                        }
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${accuracy * 2.51} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {accuracy}%
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p
                      className={`text-lg font-semibold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}
                    >
                      {accuracy >= 70
                        ? 'Excellent!'
                        : accuracy >= 40
                          ? 'Good effort!'
                          : 'Keep practicing!'}
                    </p>
                    <p className="text-sm text-white/60">
                      {accuracy >= 70
                        ? "You've mastered this material!"
                        : accuracy >= 40
                          ? "You're on the right track."
                          : 'Review the content and try again.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleRestartQuiz}
                  className="px-6 py-3 glass-btn hover:bg-white/20 rounded-xl flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} /> Try Again
                </button>
                <button
                  onClick={handleBackToDashboard}
                  className="px-6 py-3 btn-primary rounded-xl flex items-center justify-center gap-2"
                >
                  <Home size={20} /> Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const currentQuestion = questionsData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  if (!currentQuestion) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        </div>
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center glass-card p-6 rounded-xl">
            <div className="w-12 h-12 border-t-4 border-white border-solid rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-white/80">Loading question...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        <div className="hidden sm:block absolute top-20 right-10 w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 opacity-80 animate-float shadow-lg" />
      </div>

      <Navbar />

      <main className="flex-grow pt-16 pb-12 relative z-10">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header with progress */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Practice Quiz
            </h1>
            <p className="text-white/60 text-sm">{questionsData.filename}</p>

            {/* Live Stats */}
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-1 text-sm">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-white">{correctCount}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <XCircle size={16} className="text-red-400" />
                <span className="text-white">{incorrectCount}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="glass-panel p-4 mb-6 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white/70">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="text-sm text-white/70">
                {Math.round(
                  ((currentQuestionIndex + 1) / totalQuestions) * 100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-400 to-teal-300 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="glass-card p-6 mb-6">
            {questionsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-12 h-12 border-t-4 border-white border-solid rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-6">
                  {currentQuestion.question}
                </h3>

                <div className="space-y-3 mb-6">
                  {currentQuestion.choices.map(choice => (
                    <div
                      key={choice.id}
                      onClick={() => handleChoiceSelect(choice.id)}
                      className={`flex items-start p-4 rounded-xl cursor-pointer transition-all ${
                        selectedChoice === choice.id
                          ? isAnswerSubmitted
                            ? choice.id === currentQuestion.correct_answer
                              ? 'bg-green-500/20 border-2 border-green-400'
                              : 'bg-red-500/20 border-2 border-red-400'
                            : 'bg-white/20 border-2 border-white/50'
                          : isAnswerSubmitted &&
                              choice.id === currentQuestion.correct_answer
                            ? 'bg-green-500/20 border-2 border-green-400'
                            : 'glass-choice hover:bg-white/10'
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-medium ${
                          selectedChoice === choice.id
                            ? isAnswerSubmitted
                              ? choice.id === currentQuestion.correct_answer
                                ? 'bg-green-400 text-white'
                                : 'bg-red-400 text-white'
                              : 'bg-white text-teal-700'
                            : isAnswerSubmitted &&
                                choice.id === currentQuestion.correct_answer
                              ? 'bg-green-400 text-white'
                              : 'bg-white/20 text-white'
                        }`}
                      >
                        {choice.id}
                      </span>
                      <span className="text-white flex-grow">
                        {choice.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Answer Feedback */}
                {isAnswerSubmitted && validationResult && (
                  <div
                    className={`p-4 rounded-xl mb-6 ${isCorrect ? 'bg-green-500/20 border border-green-400/50' : 'bg-red-500/20 border border-red-400/50'}`}
                  >
                    <p className="font-semibold text-white mb-2">
                      {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                    </p>
                    {validationResult.explanation && (
                      <p className="text-white/80 text-sm">
                        {validationResult.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 glass-btn rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {!isAnswerSubmitted ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedChoice}
                      className={`px-6 py-2 rounded-lg font-medium ${
                        selectedChoice
                          ? 'btn-primary'
                          : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      Check Answer
                    </button>
                  ) : isLastQuestion ? (
                    <button
                      onClick={handleFinishQuiz}
                      className="px-6 py-2 btn-primary rounded-lg font-medium flex items-center gap-2"
                    >
                      <Trophy size={18} /> Finish Quiz
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-2 btn-primary rounded-lg font-medium"
                    >
                      Next Question →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={handleBackToDashboard}
              className="text-white/60 hover:text-white text-sm"
            >
              ← Exit Quiz
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default QuestionsPage;
