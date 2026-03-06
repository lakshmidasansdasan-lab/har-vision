import { Activity, Brain } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  return (
    <footer className="border-t border-border py-10 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-7 h-7 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-primary" />
              </div>
              <Activity className="w-2.5 h-2.5 text-primary/80 absolute -bottom-0.5 -right-0.5" />
            </div>
            <span className="font-display font-bold text-base text-foreground">
              HAR<span className="text-primary">Vision</span>
            </span>
          </div>

          {/* Center - tech stack */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-muted-foreground/60">
            {["CNN", "Pose Estimation", "LSTM", "Computer Vision"].map(
              (tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded border border-border bg-muted/30"
                >
                  {tech}
                </span>
              ),
            )}
          </div>

          {/* Attribution */}
          <p className="text-sm text-muted-foreground text-center sm:text-right">
            © {year}. Built with <span className="text-red-400">♥</span> using{" "}
            <a
              href={caffeineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-xs text-center text-muted-foreground/50 font-mono">
            Human Activity Recognition · Computer Vision · Deep Learning ·
            Powered by ICP
          </p>
        </div>
      </div>
    </footer>
  );
}
