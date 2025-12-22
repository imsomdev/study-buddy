'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { API_ENDPOINTS } from '@/lib/api';
import { 
  FileText, 
  Brain, 
  Zap, 
  Clock, 
  BookOpen, 
  TrendingUp,
  Award,
  Upload
} from 'lucide-react';

type Document = {
  id: number;
  filename: string;
  created_at: string;
  summary: string | null;
  key_concepts: string | null;
  questions_count: number;
  flashcards_count: number;
};

type ProgressStats = {
  total_documents_studied: number;
  total_questions_attempted: number;
  total_correct: number;
  total_incorrect: number;
  overall_accuracy: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSummaryDoc, setSelectedSummaryDoc] = useState<Document | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [docsRes, statsRes] = await Promise.all([
          fetch(API_ENDPOINTS.documents, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(API_ENDPOINTS.progressStats, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (docsRes.ok) {
          setDocuments(await docsRes.json());
        }
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleViewSummary = (doc: Document) => {
    if (doc.summary) {
      setSelectedSummaryDoc(doc);
    }
  };

  const handlePractice = (doc: Document) => {
    // Store document info in session storage for questions page
    sessionStorage.setItem('generatedQuestions', JSON.stringify({
        filename: doc.filename,
        documentId: doc.id,
        page_count: 0,
        questions: [],
        message: "Continuing study session"
    }));
    router.push('/questions');
  };

  const handleFlashcards = (doc: Document) => {
    sessionStorage.setItem('currentFlashcardDoc', doc.filename);
    router.push('/flashcards');
  };

  if (loading) {
     return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden">
        {/* Teal gradient background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        </div>
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="glass-card p-8 rounded-2xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-white/80">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Teal gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        {/* Decorative floating circles */}
        <div className="hidden sm:block absolute top-20 right-10 md:right-20 w-16 md:w-20 h-16 md:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 opacity-80 animate-float shadow-lg" />
        <div className="hidden sm:block absolute top-40 right-24 md:right-32 w-6 md:w-8 h-6 md:h-8 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-400 opacity-70 animate-float-delayed" />
        <div className="hidden md:block absolute bottom-32 right-20 w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 opacity-60 animate-float" />
      </div>

      <Navbar />
      
      <main className="flex-grow pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Start Your Learning Session
          </h1>
          <p className="text-white/70">Track your progress and enhance your knowledge with AI-driven insights.</p>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen size={80} />
            </div>
            <div className="flex items-center gap-3 mb-2 text-white">
              <div className="p-2 bg-white/10 rounded-lg">
                <FileText size={20} />
              </div>
              <h3 className="font-semibold">Total Documents</h3>
            </div>
            <p className="text-3xl font-bold text-white">{documents.length}</p>
          </div>

          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain size={80} />
            </div>
            <div className="flex items-center gap-3 mb-2 text-white">
              <div className="p-2 bg-white/10 rounded-lg">
                <Zap size={20} />
              </div>
              <h3 className="font-semibold">Questions Attempted</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.total_questions_attempted || 0}</p>
          </div>

          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Award size={80} />
            </div>
            <div className="flex items-center gap-3 mb-2 text-white">
              <div className="p-2 bg-white/10 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-semibold">Accuracy Rate</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.overall_accuracy || 0}%</p>
          </div>
        </div>

        {/* Documents List */}
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Clock size={20} className="text-white/70"/> Recent Documents
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {documents.map((doc) => (
            <div key={doc.id} className="glass-panel p-5 hover:scale-[1.02] transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/10 rounded-lg text-white group-hover:scale-105 transition-transform">
                  <FileText size={24} />
                </div>
                {doc.created_at && (
                  <span className="text-xs text-white/50 font-mono">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              <h3 className="font-semibold text-lg text-white mb-2 truncate" title={doc.filename}>
                {doc.filename}
              </h3>
              
              <div className="flex gap-2 mb-4 text-xs text-white/60">
                <span className="bg-white/10 px-2 py-1 rounded-md">
                  {doc.questions_count} Questions
                </span>
                <span className="bg-white/10 px-2 py-1 rounded-md">
                  {doc.flashcards_count} Flashcards
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button 
                  onClick={() => handleViewSummary(doc)}
                  disabled={!doc.summary}
                  className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                    doc.summary 
                    ? 'glass-btn hover:bg-white/20'
                    : 'bg-white/5 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <Brain size={16} /> {doc.summary ? 'View Summary' : 'No Summary'}
                </button>

                <button 
                  onClick={() => handlePractice(doc)}
                  className="px-3 py-2 text-sm font-medium rounded-lg glass-btn hover:bg-white/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Zap size={16} /> Practice
                </button>
                
                <button 
                  onClick={() => handleFlashcards(doc)}
                  className="col-span-2 mt-2 px-3 py-2 text-sm font-medium rounded-lg btn-primary flex items-center justify-center gap-2 transition-all"
                >
                  <BookOpen size={16} /> Study Flashcards
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {documents.length === 0 && (
          <div className="text-center py-20 glass-panel">
            <Upload size={48} className="mx-auto text-white/40 mb-4" />
            <p className="text-white/70 mb-4">You haven't uploaded any documents yet.</p>
            <button 
              onClick={() => router.push('/')}
              className="px-6 py-3 btn-primary font-bold transition-all"
            >
              Upload Your First Document
            </button>
          </div>
        )}

        {/* Summary Modal */}
        {selectedSummaryDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="glass-panel w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Brain className="text-cyan-300" /> 
                  AI Analysis: <span className="text-white/60 font-normal text-base truncate max-w-[200px]">{selectedSummaryDoc.filename}</span>
                </h2>
                <button 
                  onClick={() => setSelectedSummaryDoc(null)}
                  className="text-white/60 hover:text-white transition-colors text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="mb-6">
                  <h3 className="text-sm uppercase tracking-widest text-white/50 font-bold mb-3">Summary</h3>
                  <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                    {selectedSummaryDoc.summary}
                  </p>
                </div>

                {selectedSummaryDoc.key_concepts && (
                  <div>
                    <h3 className="text-sm uppercase tracking-widest text-white/50 font-bold mb-3">Key Concepts</h3>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(selectedSummaryDoc.key_concepts).map((concept: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white/10 border border-white/20 text-white/90 rounded-full text-sm">
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                <button 
                  onClick={() => setSelectedSummaryDoc(null)}
                  className="px-4 py-2 glass-btn hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
