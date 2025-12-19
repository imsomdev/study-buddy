import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import SupportedFormatsSection from "@/components/SupportedFormatsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-x-hidden overflow-y-auto">
      {/* Teal gradient background with subtle texture */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-500 to-cyan-400" />
        
        {/* Decorative floating circles - hidden on very small screens */}
        <div className="hidden sm:block absolute top-20 right-10 md:right-20 w-16 md:w-20 h-16 md:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 opacity-80 animate-float shadow-lg" />
        <div className="hidden sm:block absolute top-40 right-24 md:right-32 w-6 md:w-8 h-6 md:h-8 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-400 opacity-70 animate-float-delayed" />
        <div className="hidden md:block absolute bottom-32 right-20 w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 opacity-60 animate-float" />
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-teal-800/30 to-transparent" />
      </div>

      <Navbar />
      
      <main className="flex-grow">
        {/* Hero with Upload */}
        <HeroSection />
        
        {/* Features Grid */}
        <div id="features">
          <FeaturesSection />
        </div>
        
        {/* How It Works */}
        <div id="how-it-works">
          <HowItWorksSection />
        </div>
        
        {/* Supported Formats */}
        <SupportedFormatsSection />
        
        {/* FAQ Accordion */}
        <div id="faq">
          <FAQSection />
        </div>
        
        {/* Call to Action */}
        <CTASection />
      </main>
      
      <Footer />
    </div>
  );
}
