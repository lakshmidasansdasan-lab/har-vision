import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Layers,
  Star,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

type Category = "Beginner" | "Large-Scale" | "Specialized";

interface Dataset {
  name: string;
  classes: number;
  clips: string;
  category: Category;
  focus: string;
  recommended?: boolean;
  url: string;
}

const DATASETS: Dataset[] = [
  {
    name: "UCF-101",
    classes: 101,
    clips: "13,320",
    category: "Beginner",
    focus: "YouTube sports & daily activities — ideal starting point",
    recommended: true,
    url: "https://www.crcv.ucf.edu/data/UCF101.php",
  },
  {
    name: "HMDB-51",
    classes: 51,
    clips: "6,766",
    category: "Beginner",
    focus: "YouTube + movies; excellent diversity of scenes",
    url: "https://serre-lab.clps.brown.edu/resource/hmdb-a-large-human-motion-database/",
  },
  {
    name: "KTH",
    classes: 6,
    clips: "600",
    category: "Beginner",
    focus: "Simple controlled environment; ideal for early-stage testing",
    url: "https://www.csc.kth.se/cvap/actions/",
  },
  {
    name: "Kinetics-400",
    classes: 400,
    clips: "300K",
    category: "Large-Scale",
    focus: "DeepMind pre-training benchmark; best transfer learning base",
    recommended: true,
    url: "https://deepmind.com/research/open-source/kinetics",
  },
  {
    name: "Kinetics-700",
    classes: 700,
    clips: "650K",
    category: "Large-Scale",
    focus: "Industry-standard for large-scale action recognition",
    url: "https://deepmind.com/research/open-source/kinetics",
  },
  {
    name: "ActivityNet",
    classes: 200,
    clips: "28,000",
    category: "Large-Scale",
    focus: "Long untrimmed YouTube videos; dense temporal coverage",
    url: "http://activity-net.org/",
  },
  {
    name: "AVA",
    classes: 80,
    clips: "430 videos",
    category: "Large-Scale",
    focus:
      "Spatio-temporal localization; fine-grained per-person bounding boxes",
    url: "https://research.google.com/ava/",
  },
  {
    name: "Charades",
    classes: 46,
    clips: "10,000",
    category: "Specialized",
    focus: "Household & daily activities; multi-label classification",
    url: "https://allenai.org/data/charades",
  },
  {
    name: "EPIC-Kitchens",
    classes: 97,
    clips: "55,000",
    category: "Specialized",
    focus: "Egocentric first-person cooking; fine-grained recognition",
    url: "https://epic-kitchens.github.io/",
  },
  {
    name: "NTU RGB+D",
    classes: 120,
    clips: "114,000",
    category: "Specialized",
    focus: "Skeleton & depth-based; ideal for pose-driven pipelines",
    recommended: true,
    url: "http://rose1.ntu.edu.sg/datasets/actionrecognition.asp",
  },
];

const CATEGORY_CONFIG: Record<
  Category,
  {
    color: string;
    glowStyle: React.CSSProperties;
    badgeClass: string;
    dotClass: string;
  }
> = {
  Beginner: {
    color: "oklch(0.72 0.19 160)",
    glowStyle: {
      borderColor: "oklch(0.72 0.19 160 / 0.35)",
      boxShadow: "0 0 14px oklch(0.72 0.19 160 / 0.12)",
    },
    badgeClass: "bg-emerald-950/60 text-emerald-300 border-emerald-700/50",
    dotClass: "bg-emerald-400",
  },
  "Large-Scale": {
    color: "oklch(0.72 0.2 195)",
    glowStyle: {
      borderColor: "oklch(0.72 0.2 195 / 0.35)",
      boxShadow: "0 0 14px oklch(0.72 0.2 195 / 0.12)",
    },
    badgeClass: "bg-cyan-950/60 text-cyan-300 border-cyan-700/50",
    dotClass: "bg-cyan-400",
  },
  Specialized: {
    color: "oklch(0.68 0.18 290)",
    glowStyle: {
      borderColor: "oklch(0.68 0.18 290 / 0.35)",
      boxShadow: "0 0 14px oklch(0.68 0.18 290 / 0.12)",
    },
    badgeClass: "bg-purple-950/60 text-purple-300 border-purple-700/50",
    dotClass: "bg-purple-400",
  },
};

const WORKFLOW_STEPS = [
  {
    icon: Download,
    step: "01",
    title: "Download Dataset",
    desc: "Obtain a benchmark (e.g., UCF-101) from an academic repository. Most require free registration.",
    detail: "~6.8 GB for UCF-101",
    color: "oklch(0.72 0.19 160)",
  },
  {
    icon: Layers,
    step: "02",
    title: "Extract Frames",
    desc: "Decode videos at 30 fps with OpenCV + FFmpeg. Resize to 224×224, normalize with ImageNet stats.",
    detail: "OpenCV + FFmpeg",
    color: "oklch(0.72 0.2 195)",
  },
  {
    icon: Cpu,
    step: "03",
    title: "Train / Fine-Tune",
    desc: "Load Kinetics-400 pretrained weights. Fine-tune a ResNet-50 or I3D backbone on your target labels.",
    detail: "PyTorch / TF Hub",
    color: "oklch(0.75 0.18 270)",
  },
  {
    icon: Zap,
    step: "04",
    title: "Export to ONNX",
    desc: "Convert your trained model to ONNX format for cross-platform, low-latency inference.",
    detail: "torch.onnx.export",
    color: "oklch(0.72 0.21 35)",
  },
  {
    icon: Star,
    step: "05",
    title: "Integrate with HAR Vision",
    desc: "Load the ONNX model into the HAR Vision pipeline and run real-time classification on uploaded or webcam videos.",
    detail: "10 activity classes",
    color: "oklch(0.65 0.18 320)",
  },
];

function DatasetCard({
  dataset,
  index,
}: {
  dataset: Dataset;
  index: number;
}) {
  const cfg = CATEGORY_CONFIG[dataset.category];
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      data-ocid={`datasets.card.${index + 1}`}
    >
      <a
        href={dataset.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        <Card
          className="glass-surface border h-full group relative overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
          style={cfg.glowStyle}
        >
          {dataset.recommended && (
            <div
              className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.72 0.2 195 / 0.9)",
                boxShadow: "0 0 8px oklch(0.72 0.2 195 / 0.5)",
              }}
              title="Recommended"
              data-ocid={`datasets.recommended_badge.${index + 1}`}
            >
              <Star className="w-3 h-3 text-background fill-background" />
            </div>
          )}
          <CardContent className="p-5 flex flex-col gap-3">
            {/* Name + tier */}
            <div className="flex items-start justify-between gap-2 pr-6">
              <h3
                className="font-display font-bold text-foreground group-hover:brightness-110 transition-all flex items-center gap-1.5"
                style={{ color: cfg.color }}
              >
                {dataset.name}
                <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-current transition-colors shrink-0" />
              </h3>
            </div>

            <Badge
              variant="outline"
              className={`text-xs font-mono w-fit px-2 py-0.5 border ${cfg.badgeClass}`}
            >
              {dataset.category}
            </Badge>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div
                  className="font-display font-bold text-lg leading-none"
                  style={{ color: cfg.color }}
                >
                  {dataset.classes}
                </div>
                <div className="text-xs text-muted-foreground">classes</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="font-display font-bold text-lg leading-none text-foreground">
                  {dataset.clips}
                </div>
                <div className="text-xs text-muted-foreground">clips</div>
              </div>
            </div>

            {/* Notes */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {dataset.focus}
            </p>
          </CardContent>
        </Card>
      </a>
    </motion.div>
  );
}

const FILTER_OPTIONS: (Category | "All")[] = [
  "All",
  "Beginner",
  "Large-Scale",
  "Specialized",
];

export default function DatasetReferenceSection() {
  const [activeFilter, setActiveFilter] = useState<Category | "All">("All");

  const filtered =
    activeFilter === "All"
      ? DATASETS
      : DATASETS.filter((d) => d.category === activeFilter);

  return (
    <section
      id="datasets"
      className="py-20 px-4 sm:px-6 bg-muted/10"
      data-ocid="datasets.section"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono tracking-widest mb-4">
            <Database className="w-3 h-3" />
            TRAINING DATASETS
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
            Dataset Reference
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            10 industry-standard HAR benchmarks for training and fine-tuning
            activity recognition models.{" "}
            <span className="text-primary font-semibold">★ Recommended</span>{" "}
            datasets are highlighted.
          </p>
        </motion.div>

        {/* Filters + Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-8"
        >
          {/* Category filter */}
          <div
            className="flex flex-wrap gap-2"
            data-ocid="datasets.category_filter"
          >
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt;
              const cfg = opt !== "All" ? CATEGORY_CONFIG[opt] : null;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setActiveFilter(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all duration-200 ${
                    isActive
                      ? opt === "All"
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : `${cfg?.badgeClass}`
                      : "bg-muted/20 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                  data-ocid={`datasets.filter.${opt
                    .toLowerCase()
                    .replace(/[- ]/g, "_")}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            {(["Beginner", "Large-Scale", "Specialized"] as const).map(
              (cat) => (
                <span key={cat} className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${CATEGORY_CONFIG[cat].dotClass}`}
                  />
                  {cat}
                </span>
              ),
            )}
          </div>
        </motion.div>

        {/* Dataset cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-14">
          {filtered.map((dataset, idx) => (
            <DatasetCard key={dataset.name} dataset={dataset} index={idx} />
          ))}
        </div>

        {/* Integration Workflow */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono tracking-widest mb-4">
            <BookOpen className="w-3 h-3" />
            INTEGRATION GUIDE
          </div>
          <h3 className="font-display font-bold text-2xl text-foreground mb-2">
            Integration Workflow
          </h3>
          <p className="text-muted-foreground text-sm">
            From raw dataset to live inference in HAR Vision
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="glass-surface rounded-2xl p-6 border border-primary/20"
          data-ocid="datasets.workflow_section"
          style={{ boxShadow: "0 0 20px oklch(0.72 0.2 195 / 0.08)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {WORKFLOW_STEPS.map(
              ({ icon: Icon, step, title, desc, detail, color }, idx) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  className="flex flex-col gap-3"
                  data-ocid={`datasets.workflow_step.${idx + 1}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `${color}20`,
                      border: `1px solid ${color}50`,
                      boxShadow: `0 0 10px ${color}20`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-mono font-bold opacity-60"
                        style={{ color }}
                      >
                        {step}
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                      {desc}
                    </p>
                    <div
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono"
                      style={{
                        background: `${color}15`,
                        border: `1px solid ${color}40`,
                        color,
                      }}
                    >
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: color }}
                      />
                      {detail}
                    </div>
                  </div>
                </motion.div>
              ),
            )}
          </div>
        </motion.div>

        {/* Recommended combo note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-8 p-4 rounded-xl border border-primary/20 bg-primary/5 text-center"
          data-ocid="datasets.recommendation_note"
        >
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-semibold">
              ★ Recommended combo:{" "}
            </span>
            Fine-tune on{" "}
            <span className="font-mono text-foreground">UCF-101</span> using{" "}
            <span className="font-mono text-foreground">Kinetics-400</span>{" "}
            pretrained weights, then add{" "}
            <span className="font-mono text-foreground">NTU RGB+D</span> for
            skeleton-based pose features.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
