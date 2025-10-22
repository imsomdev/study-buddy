import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-cyan-900/30">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <Navbar />
      <main className="flex-grow pt-16 pb-12 relative z-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            {/* <h1 className="text-4xl font-bold text-white mb-3">Study Buddy</h1> */}
            <p className="text-lg text-gray-200 max-w-xl mx-auto">
              Upload your study materials and generate interactive MCQs in
              seconds
            </p>
          </div>
          <FileUpload />
        </div>
      </main>
      <Footer />
    </div>
  );
}
