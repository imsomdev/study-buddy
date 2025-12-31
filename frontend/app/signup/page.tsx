import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthForm from '@/components/AuthForm';

export const metadata = {
  title: 'Join Now | Study Buddy',
  description:
    'Create your free Study Buddy account to start generating AI-powered study materials.',
};

export default function SignupPage() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Background with Teal/Cyan Gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-800 via-teal-600 to-cyan-500" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px]" />
      </div>

      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 pt-20 pb-12">
        <div className="container max-w-7xl mx-auto flex flex-col items-center">
          <AuthForm type="signup" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
