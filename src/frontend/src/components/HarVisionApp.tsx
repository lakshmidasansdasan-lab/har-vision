import { useRef } from "react";
import Footer from "./Footer";
import NavBar from "./NavBar";
import HeroSection from "./sections/HeroSection";
import HistorySection from "./sections/HistorySection";
import HowItWorksSection from "./sections/HowItWorksSection";
import UploadAnalyzeSection from "./sections/UploadAnalyzeSection";

export default function HarVisionApp() {
  const uploadRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar
        onScrollToUpload={scrollToUpload}
        onScrollToHistory={scrollToHistory}
      />

      <main>
        <HeroSection onAnalyzeClick={scrollToUpload} />
        <div ref={uploadRef}>
          <UploadAnalyzeSection />
        </div>
        <HowItWorksSection />
        <div ref={historyRef}>
          <HistorySection />
        </div>
      </main>

      <Footer />
    </div>
  );
}
