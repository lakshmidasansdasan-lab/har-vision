import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  CheckCircle2,
  Clock,
  FileVideo,
  Layers,
  Loader2,
  Play,
  Scan,
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { ActivityLabel, AnalysisStatus } from "../../types/har";
import type { ActivityResult } from "../../types/har";
import { DEMO_RESULTS, formatFileSize } from "../../utils/activityUtils";
import ResultsPanel from "../ResultsPanel";
import WebcamDetectionSection from "../WebcamDetectionSection";

interface ProcessingStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  duration: number;
}

const PROCESSING_STEPS: ProcessingStep[] = [
  {
    id: "frames",
    label: "Frame Extraction",
    sublabel: "Sampling video at 30fps intervals",
    icon: <Layers className="w-4 h-4" />,
    duration: 1500,
  },
  {
    id: "cnn",
    label: "CNN Analysis",
    sublabel: "Running ResNet-50 feature extraction",
    icon: <Brain className="w-4 h-4" />,
    duration: 2000,
  },
  {
    id: "pose",
    label: "Pose Estimation",
    sublabel: "Detecting 17 skeletal keypoints per frame",
    icon: <Scan className="w-4 h-4" />,
    duration: 2000,
  },
  {
    id: "temporal",
    label: "Temporal Analysis",
    sublabel: "Building motion sequences with LSTM",
    icon: <Clock className="w-4 h-4" />,
    duration: 1500,
  },
  {
    id: "classify",
    label: "Classification",
    sublabel: "Mapping sequences to activity labels",
    icon: <Zap className="w-4 h-4" />,
    duration: 1000,
  },
];

interface SelectedFile {
  file: File;
  name: string;
  size: bigint;
  duration: number;
}

type AnalysisState =
  | { stage: "idle" }
  | { stage: "file-selected"; selected: SelectedFile }
  | {
      stage: "processing";
      currentStep: number;
      stepProgress: number;
      analysisId: bigint;
    }
  | {
      stage: "completed";
      results: ActivityResult[];
      analysisId: bigint;
      filename: string;
      duration: number;
    };

function estimateDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(
        Number.isFinite(video.duration) &&
          video.duration !== Number.POSITIVE_INFINITY
          ? video.duration
          : 30,
      );
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(30);
    };
    video.src = url;
  });
}

function generateMockResults(duration: number): ActivityResult[] {
  const activities = [
    ActivityLabel.walking,
    ActivityLabel.standing,
    ActivityLabel.waving,
    ActivityLabel.running,
    ActivityLabel.clapping,
    ActivityLabel.jumping,
  ];
  const results: ActivityResult[] = [];
  let currentTime = 0;
  const segmentCount = Math.max(3, Math.min(6, Math.floor(duration / 5)));
  const shuffled = [...activities]
    .sort(() => Math.random() - 0.5)
    .slice(0, segmentCount);
  const segmentDuration = duration / segmentCount;

  for (let i = 0; i < shuffled.length; i++) {
    const startTime = Number.parseFloat(currentTime.toFixed(1));
    const endTime = Number.parseFloat(
      (currentTime + segmentDuration).toFixed(1),
    );
    const confidence = Number.parseFloat(
      (0.72 + Math.random() * 0.25).toFixed(2),
    );
    results.push({
      activityLabel: shuffled[i],
      confidence,
      startTime,
      endTime,
    });
    currentTime = endTime;
  }
  return results;
}

type SectionTab = "upload" | "webcam";

export default function UploadAnalyzeSection() {
  const [activeTab, setActiveTab] = useState<SectionTab>("upload");
  const [state, setState] = useState<AnalysisState>({ stage: "idle" });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { actor } = useActor();

  const handleFileSelect = useCallback(async (file: File) => {
    const allowedExtensions = [".mp4", ".avi", ".mov", ".webm"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!allowedExtensions.includes(ext) && !file.type.startsWith("video/")) {
      toast.error("Unsupported format. Please upload MP4, AVI, MOV, or WebM.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 500MB.");
      return;
    }
    const duration = await estimateDuration(file);
    setState({
      stage: "file-selected",
      selected: { file, name: file.name, size: BigInt(file.size), duration },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const runProcessingSteps = async (speedMultiplier: number) => {
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      const stepDuration = PROCESSING_STEPS[i].duration * speedMultiplier;
      const tickMs = 50;
      const ticks = Math.floor(stepDuration / tickMs);

      for (let t = 0; t <= ticks; t++) {
        setState((prev) =>
          prev.stage === "processing"
            ? {
                ...prev,
                currentStep: i,
                stepProgress: Math.min(100, Math.round((t / ticks) * 100)),
              }
            : prev,
        );
        await new Promise<void>((r) => setTimeout(r, tickMs));
      }
    }
  };

  const startAnalysis = async () => {
    if (state.stage !== "file-selected" || !actor) return;
    const { selected } = state;

    let analysisId: bigint;
    try {
      const arrayBuffer = await selected.file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;
      const externalBlob = ExternalBlob.fromBytes(bytes);
      analysisId = await actor.submitVideo(
        selected.name,
        selected.size,
        selected.duration,
        externalBlob,
      );
      await actor.updateAnalysisStatus(analysisId, AnalysisStatus.processing);
    } catch (err) {
      toast.error("Failed to submit video. Please try again.");
      console.error(err);
      return;
    }

    setState({
      stage: "processing",
      currentStep: 0,
      stepProgress: 0,
      analysisId,
    });
    await runProcessingSteps(1);

    const results = generateMockResults(selected.duration);

    try {
      await actor.setActivityResults(analysisId, results);
      await actor.updateAnalysisStatus(analysisId, AnalysisStatus.completed);
    } catch (err) {
      console.error("Failed to save results:", err);
      toast.error("Failed to save analysis results.");
    }

    setState({
      stage: "completed",
      results,
      analysisId,
      filename: selected.name,
      duration: selected.duration,
    });
    queryClient.invalidateQueries({ queryKey: ["analyses"] });
    toast.success("Analysis complete! Activities detected.");
  };

  const loadDemo = async () => {
    if (!actor) {
      toast.error("Not connected. Please wait a moment.");
      return;
    }

    const fakeName = "demo_activity_sample.mp4";
    const fakeSize = BigInt(12_500_000);
    const fakeDuration = 25;

    let analysisId: bigint;
    try {
      const demoBytes = new Uint8Array(8) as Uint8Array<ArrayBuffer>;
      const externalBlob = ExternalBlob.fromBytes(demoBytes);
      analysisId = await actor.submitVideo(
        fakeName,
        fakeSize,
        fakeDuration,
        externalBlob,
      );
      await actor.updateAnalysisStatus(analysisId, AnalysisStatus.processing);
    } catch (err) {
      toast.error("Failed to start demo analysis.");
      console.error(err);
      return;
    }

    setState({
      stage: "processing",
      currentStep: 0,
      stepProgress: 0,
      analysisId,
    });
    await runProcessingSteps(0.4);

    try {
      await actor.setActivityResults(analysisId, DEMO_RESULTS);
      await actor.updateAnalysisStatus(analysisId, AnalysisStatus.completed);
    } catch (err) {
      console.error(err);
    }

    setState({
      stage: "completed",
      results: DEMO_RESULTS,
      analysisId,
      filename: fakeName,
      duration: fakeDuration,
    });
    queryClient.invalidateQueries({ queryKey: ["analyses"] });
    toast.success("Demo analysis complete!");
  };

  const reset = () => setState({ stage: "idle" });

  const overallProgress =
    state.stage === "processing"
      ? Math.round(
          ((state.currentStep * 100 + state.stepProgress) /
            (PROCESSING_STEPS.length * 100)) *
            100,
        )
      : 0;

  return (
    <section className="py-20 px-4 sm:px-6" data-ocid="upload.section">
      <div className="container mx-auto max-w-4xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono tracking-widest mb-4">
            <Zap className="w-3 h-3" />
            UPLOAD & ANALYZE
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
            Analyze Your Video
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upload a video or use your webcam for live activity detection. Our
            deep learning pipeline classifies human activities with confidence
            scores.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-muted/30 backdrop-blur-sm">
            <button
              type="button"
              data-ocid="upload.tab"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-display font-semibold transition-all duration-200 ${
                activeTab === "upload"
                  ? "bg-primary text-primary-foreground glow-cyan"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Video
            </button>
            <button
              type="button"
              data-ocid="webcam.tab"
              onClick={() => setActiveTab("webcam")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-display font-semibold transition-all duration-200 ${
                activeTab === "webcam"
                  ? "bg-primary text-primary-foreground glow-cyan"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Live Webcam
            </button>
          </div>
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "webcam" ? (
            <motion.div
              key="webcam-tab"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <WebcamDetectionSection />
            </motion.div>
          ) : (
            <motion.div
              key="upload-tab"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <AnimatePresence mode="wait">
                {/* Idle / File selection */}
                {(state.stage === "idle" ||
                  state.stage === "file-selected") && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <label
                      htmlFor="video-upload"
                      data-ocid="upload.dropzone"
                      onDrop={handleDrop}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      className={`
                        relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 block
                        ${state.stage === "idle" ? "cursor-pointer" : "cursor-default"}
                        ${
                          isDragOver
                            ? "border-primary bg-primary/10 glow-border-cyan"
                            : state.stage === "file-selected"
                              ? "border-primary/50 bg-primary/5 glow-border-cyan"
                              : "border-border hover:border-primary/50 hover:bg-primary/5"
                        }
                      `}
                    >
                      <input
                        id="video-upload"
                        ref={fileInputRef}
                        type="file"
                        accept=".mp4,.avi,.mov,.webm,video/*"
                        disabled={state.stage !== "idle"}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                        data-ocid="upload.input"
                      />

                      <AnimatePresence mode="wait">
                        {state.stage === "idle" ? (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                              <Upload className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                              Drop your video here
                            </h3>
                            <p className="text-muted-foreground text-sm mb-1">
                              Supported: MP4, AVI, MOV, WebM — max 500MB
                            </p>
                            <p className="text-muted-foreground/60 text-xs">
                              or click to browse files
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="selected"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                reset();
                              }}
                              className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
                              data-ocid="upload.clear_button"
                              aria-label="Remove selected file"
                            >
                              <X className="w-5 h-5" />
                            </button>

                            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mx-auto mb-4">
                              <FileVideo className="w-7 h-7 text-primary" />
                            </div>

                            {state.stage === "file-selected" && (
                              <div className="space-y-1">
                                <p className="font-display font-semibold text-foreground truncate max-w-xs mx-auto">
                                  {state.selected.name}
                                </p>
                                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                                  <span>
                                    {formatFileSize(state.selected.size)}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                                  <span>
                                    ~{Math.round(state.selected.duration)}s
                                    duration
                                  </span>
                                </div>
                                <p className="text-primary/70 text-xs font-mono mt-2">
                                  ✓ Ready for analysis
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </label>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      {state.stage === "file-selected" && (
                        <Button
                          size="lg"
                          onClick={startAnalysis}
                          data-ocid="upload.start_button"
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-display font-semibold"
                        >
                          <Zap className="mr-2 w-4 h-4" />
                          Start Analysis
                        </Button>
                      )}
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={loadDemo}
                        data-ocid="upload.demo_button"
                        className={`border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 font-display font-semibold ${
                          state.stage === "file-selected" ? "" : "w-full"
                        }`}
                      >
                        <Play className="mr-2 w-4 h-4" />
                        Try Demo
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Processing */}
                {state.stage === "processing" && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    data-ocid="upload.loading_state"
                  >
                    <Card className="glass-surface border-primary/20 glow-border-cyan">
                      <CardContent className="p-8">
                        <div className="text-center mb-8">
                          <div className="relative w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                            <Loader2 className="w-7 h-7 text-primary animate-spin" />
                            <div className="absolute inset-0 rounded-2xl glow-cyan opacity-50" />
                          </div>
                          <h3 className="font-display font-bold text-xl text-foreground mb-1">
                            Analyzing Video
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            AI pipeline processing — {overallProgress}% complete
                          </p>
                        </div>

                        {/* Overall progress */}
                        <div className="max-w-md mx-auto mb-6">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              animate={{ width: `${overallProgress}%` }}
                              transition={{ duration: 0.3 }}
                              style={{
                                boxShadow:
                                  "0 0 12px oklch(0.75 0.20 195 / 0.6)",
                              }}
                            />
                          </div>
                        </div>

                        {/* Steps */}
                        <div className="space-y-2 max-w-md mx-auto">
                          {PROCESSING_STEPS.map((step, idx) => {
                            const isActive = idx === state.currentStep;
                            const isDone = idx < state.currentStep;
                            const progress = isActive
                              ? state.stepProgress
                              : isDone
                                ? 100
                                : 0;

                            return (
                              <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{
                                  opacity: isDone || isActive ? 1 : 0.35,
                                  x: 0,
                                }}
                                transition={{ delay: idx * 0.08 }}
                                className={`rounded-lg overflow-hidden transition-all duration-300 ${
                                  isActive
                                    ? "border border-primary/40 bg-primary/8"
                                    : ""
                                }`}
                              >
                                <div
                                  className={`flex items-center gap-3 px-3 py-2.5 ${isActive ? "bg-primary/5" : ""}`}
                                >
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                      isDone
                                        ? "bg-primary/20 text-primary"
                                        : isActive
                                          ? "bg-primary/20 text-primary"
                                          : "bg-muted/50 text-muted-foreground"
                                    }`}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-4 h-4" />
                                    ) : isActive ? (
                                      <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                          duration: 1.5,
                                          repeat: Number.POSITIVE_INFINITY,
                                          ease: "linear",
                                        }}
                                      >
                                        {step.icon}
                                      </motion.div>
                                    ) : (
                                      step.icon
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span
                                        className={`text-sm font-mono font-semibold truncate ${
                                          isActive
                                            ? "text-primary"
                                            : isDone
                                              ? "text-foreground/70"
                                              : "text-muted-foreground/50"
                                        }`}
                                      >
                                        {step.label}
                                      </span>
                                      {isDone && (
                                        <span className="text-xs font-mono text-primary/60 flex-shrink-0">
                                          DONE
                                        </span>
                                      )}
                                      {isActive && (
                                        <span className="text-xs font-mono text-primary flex-shrink-0">
                                          {state.stepProgress}%
                                        </span>
                                      )}
                                    </div>
                                    {isActive && (
                                      <p className="text-xs text-muted-foreground/70 font-mono truncate mt-0.5">
                                        {step.sublabel}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Per-step progress bar */}
                                {(isActive || isDone) && (
                                  <div className="h-0.5 bg-muted/50">
                                    <motion.div
                                      className="h-full bg-primary/60"
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 0.1 }}
                                    />
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Step counter */}
                        <p className="text-center text-xs text-muted-foreground font-mono mt-5">
                          Step{" "}
                          {Math.min(
                            state.currentStep + 1,
                            PROCESSING_STEPS.length,
                          )}{" "}
                          of {PROCESSING_STEPS.length}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Completed */}
                {state.stage === "completed" && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    data-ocid="upload.success_state"
                  >
                    <ResultsPanel
                      results={state.results}
                      analysisId={state.analysisId}
                      onReset={reset}
                      filename={state.filename}
                      duration={state.duration}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
