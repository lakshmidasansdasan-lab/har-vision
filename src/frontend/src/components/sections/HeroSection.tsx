import { Button } from "@/components/ui/button";
import { Activity, ChevronDown, Eye, Zap } from "lucide-react";
import { motion } from "motion/react";

interface HeroSectionProps {
  onAnalyzeClick: () => void;
}

const stats = [
  { icon: Eye, label: "Activities Recognized", value: "10+" },
  { icon: Zap, label: "Real-time Analysis", value: "30fps" },
  { icon: Activity, label: "CNN Accuracy", value: "95%+" },
];

export default function HeroSection({ onAnalyzeClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col pt-16">
      {/* Hero image */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "400px" }}
      >
        <img
          src="/assets/generated/har-hero.dim_1200x400.jpg"
          alt="HAR Vision - Human Activity Recognition System"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />

        {/* Overlay text on image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center px-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              DEEP LEARNING ACTIVE
            </div>
            <h1 className="font-display font-bold text-5xl sm:text-7xl tracking-tight text-foreground glow-cyan-text">
              HAR<span className="text-primary">Vision</span>
            </h1>
          </motion.div>
        </div>
      </div>

      {/* Hero content */}
      <div className="container mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-center py-12 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display font-semibold text-2xl sm:text-3xl text-foreground mb-4 leading-snug">
            Human Activity Recognition from Video
            <br />
            <span className="text-primary">
              using Computer Vision & Deep Learning
            </span>
          </h2>

          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            Upload any video clip and our AI pipeline — powered by Convolutional
            Neural Networks and pose estimation — automatically detects and
            classifies human activities like walking, running, clapping, waving,
            and more with high confidence scores.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Button
              size="lg"
              onClick={onAnalyzeClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-display font-semibold tracking-wide px-8"
            >
              <Zap className="mr-2 w-4 h-4" />
              Analyze Video
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onAnalyzeClick}
              className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/70 font-display font-semibold tracking-wide px-8"
            >
              <Eye className="mr-2 w-4 h-4" />
              View Demo
            </Button>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="grid grid-cols-3 gap-4 max-w-lg mx-auto"
          >
            {stats.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="glass-surface rounded-lg p-3 text-center"
              >
                <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <div className="font-display font-bold text-lg text-primary">
                  {value}
                </div>
                <div className="text-muted-foreground text-xs">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="flex justify-center mt-10"
        >
          <button
            type="button"
            onClick={onAnalyzeClick}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronDown className="w-6 h-6 animate-bounce" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
