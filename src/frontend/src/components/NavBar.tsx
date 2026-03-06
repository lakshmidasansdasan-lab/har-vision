import { Button } from "@/components/ui/button";
import { Activity, Brain } from "lucide-react";
import { motion } from "motion/react";

interface NavBarProps {
  onScrollToUpload: () => void;
  onScrollToHistory: () => void;
}

export default function NavBar({
  onScrollToUpload,
  onScrollToHistory,
}: NavBarProps) {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 glass-surface border-b border-border"
    >
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <Activity className="w-3 h-3 text-primary/80 absolute -bottom-0.5 -right-0.5" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">
            HAR<span className="text-primary glow-cyan-text">Vision</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={onScrollToUpload}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Analyze
          </button>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("how-it-works")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={onScrollToHistory}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            History
          </button>
        </nav>

        <Button
          size="sm"
          onClick={onScrollToUpload}
          className="bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 hover:border-primary/60 transition-all glow-border-cyan text-xs font-mono tracking-wider"
        >
          START ANALYSIS
        </Button>
      </div>
    </motion.header>
  );
}
