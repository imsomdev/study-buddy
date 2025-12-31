import FileUpload from '@/components/FileUpload';

const HeroSection = () => {
  return (
    <section className="pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12 relative z-10">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        {/* Hero Text */}
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 sm:mb-4 tracking-tight drop-shadow-lg">
            Study Buddy
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto font-light px-2">
            Upload your study materials and generate interactive MCQs in
            seconds. Just drag and drop.
          </p>
        </div>

        {/* Upload Component */}
        <FileUpload />
      </div>
    </section>
  );
};

export default HeroSection;
