import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  Cpu,
  Heart,
  Layers,
  Monitor,
  Shield,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";

const PIPELINE_STEPS = [
  {
    step: "01",
    icon: Layers,
    title: "Frame Extraction",
    description:
      "The video is decoded and split into individual frames at a consistent rate. Each frame is preprocessed and normalized for analysis.",
    detail: "30fps → individual frames",
  },
  {
    step: "02",
    icon: Cpu,
    title: "CNN Feature Extraction",
    description:
      "A deep Convolutional Neural Network processes each frame to extract high-level spatial features — edges, shapes, textures, and body regions.",
    detail: "ResNet-50 backbone",
  },
  {
    step: "03",
    icon: Brain,
    title: "Pose Estimation",
    description:
      "Skeletal keypoints are detected for each frame — 17 body joints including shoulders, elbows, knees, and hips — forming a pose skeleton.",
    detail: "17 joint keypoints",
  },
  {
    step: "04",
    icon: TrendingUp,
    title: "Temporal Analysis",
    description:
      "Consecutive frames are analyzed as sequences using LSTM layers to capture motion dynamics and classify activities across time.",
    detail: "LSTM temporal modeling",
  },
];

const USE_CASES = [
  {
    icon: Shield,
    title: "Smart Surveillance",
    description:
      "Automatically detect suspicious activities, falls, or unauthorized behaviors in security footage.",
    color: "oklch(0.72 0.20 195)",
  },
  {
    icon: Heart,
    title: "Healthcare Monitoring",
    description:
      "Monitor patient movements, detect falls, and assess rehabilitation progress remotely.",
    color: "oklch(0.75 0.20 320)",
  },
  {
    icon: Trophy,
    title: "Sports Analysis",
    description:
      "Analyze athletic techniques, track performance metrics, and provide coaching insights.",
    color: "oklch(0.72 0.21 35)",
  },
  {
    icon: Monitor,
    title: "Human-Computer Interaction",
    description:
      "Enable gesture-based interfaces, sign language recognition, and touchless controls.",
    color: "oklch(0.70 0.22 160)",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono tracking-widest mb-4">
            <Brain className="w-3 h-3" />
            DEEP LEARNING PIPELINE
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A multi-stage AI pipeline processes your video through advanced
            computer vision and deep learning techniques.
          </p>
        </motion.div>

        {/* Pipeline steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
          {PIPELINE_STEPS.map(
            ({ step, icon: Icon, title, description, detail }, idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="glass-surface border-border hover:border-primary/30 transition-all h-full group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-all">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs text-primary/60">
                            {step}
                          </span>
                          <h3 className="font-display font-semibold text-foreground">
                            {title}
                          </h3>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                          {description}
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {detail}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ),
          )}
        </div>

        {/* Use cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h3 className="font-display font-bold text-2xl text-foreground mb-2">
            Use Cases
          </h3>
          <p className="text-muted-foreground text-sm">
            HAR Vision enables intelligent automation across industries
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {USE_CASES.map(({ icon: Icon, title, description, color }, idx) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
            >
              <Card className="glass-surface border-border hover:border-primary/30 transition-all h-full text-center group">
                <CardContent className="p-5">
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all"
                    style={{
                      background: `${color}15`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h4 className="font-display font-semibold text-foreground text-sm mb-2">
                    {title}
                  </h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
