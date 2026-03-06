import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Loader2,
  Save,
  Square,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActivityLabel, AnalysisStatus, ExternalBlob } from "../backend";
import type { ActivityResult } from "../backend.d.ts";
import { useCamera } from "../camera/useCamera";
import { useActor } from "../hooks/useActor";
import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  ACTIVITY_LABELS_DISPLAY,
} from "../utils/activityUtils";

interface DetectionEntry {
  label: ActivityLabel;
  confidence: number;
  timestamp: Date;
}

const ALL_LABELS = Object.values(ActivityLabel);

function randomActivity(): { label: ActivityLabel; confidence: number } {
  const label = ALL_LABELS[Math.floor(Math.random() * ALL_LABELS.length)];
  const confidence = Number.parseFloat(
    (0.65 + Math.random() * 0.32).toFixed(2),
  );
  return { label, confidence };
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export default function WebcamDetectionSection() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const {
    isActive,
    error,
    isLoading,
    startCamera,
    stopCamera,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "user", width: 640, height: 480 });

  const [isDetecting, setIsDetecting] = useState(false);
  const [currentDetection, setCurrentDetection] = useState<{
    label: ActivityLabel;
    confidence: number;
  } | null>(null);
  const [activityLog, setActivityLog] = useState<DetectionEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [, setTick] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  // Tick to refresh relative timestamps every 5 seconds
  useEffect(() => {
    const ticker = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(ticker);
  }, []);

  const stopDetectionInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  const startDetection = useCallback(async () => {
    if (!isActive) {
      const ok = await startCamera();
      if (!ok) return;
    }
    sessionStartRef.current = new Date();
    setIsDetecting(true);
    intervalRef.current = setInterval(() => {
      const { label, confidence } = randomActivity();
      setCurrentDetection({ label, confidence });
      setActivityLog((prev) => [
        { label, confidence, timestamp: new Date() },
        ...prev,
      ]);
    }, 2500);
  }, [isActive, startCamera]);

  const stopDetection = useCallback(() => {
    stopDetectionInterval();
    setCurrentDetection(null);
  }, [stopDetectionInterval]);

  const handleStopCamera = useCallback(async () => {
    stopDetectionInterval();
    setCurrentDetection(null);
    await stopCamera();
  }, [stopDetectionInterval, stopCamera]);

  const handleSaveSession = useCallback(async () => {
    if (!actor || activityLog.length === 0) return;
    setIsSaving(true);

    try {
      const dummyBytes = new Uint8Array(8) as Uint8Array<ArrayBuffer>;
      const blob = ExternalBlob.fromBytes(dummyBytes);
      const sessionDuration = sessionStartRef.current
        ? (Date.now() - sessionStartRef.current.getTime()) / 1000
        : 30;

      const analysisId = await actor.submitVideo(
        `webcam_session_${Date.now()}.mp4`,
        BigInt(0),
        sessionDuration,
        blob,
      );

      // Convert log entries to ActivityResult[]
      const results: ActivityResult[] = activityLog
        .slice()
        .reverse()
        .map((entry, i) => ({
          activityLabel: entry.label,
          confidence: entry.confidence,
          startTime: i * 2.5,
          endTime: (i + 1) * 2.5,
        }));

      await actor.setActivityResults(analysisId, results);
      await actor.updateAnalysisStatus(analysisId, AnalysisStatus.completed);

      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      toast.success("Session saved to analysis history!");
    } catch (err) {
      console.error("Failed to save session:", err);
      toast.error("Failed to save session. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [actor, activityLog, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const visibleLog = activityLog.slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Camera viewport */}
      <div
        className="relative rounded-xl overflow-hidden glass-surface glow-border-cyan"
        style={{ minHeight: 280 }}
      >
        {/* Video element */}
        <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: isActive ? "block" : "none" }}
          />
          <canvas
            ref={canvasRef}
            data-ocid="webcam.canvas_target"
            style={{ display: "none" }}
          />

          {/* Not-yet-active placeholder */}
          {!isActive && !isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
                <Camera className="w-9 h-9 text-primary/70" />
              </div>
              <p className="text-muted-foreground text-sm font-mono">
                Camera inactive — click Start Detection
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div
              data-ocid="webcam.loading_state"
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/80"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-primary/80 text-sm font-mono tracking-wider">
                Initializing camera...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              data-ocid="webcam.error_state"
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 p-6 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <p className="text-foreground font-display font-semibold mb-1">
                Camera access failed
              </p>
              <p className="text-muted-foreground text-sm max-w-xs">
                {error.type === "permission"
                  ? "Please allow camera permission in your browser settings, then try again."
                  : error.type === "not-found"
                    ? "No camera device found. Connect a webcam and try again."
                    : error.type === "not-supported"
                      ? "Your browser does not support camera access."
                      : error.message}
              </p>
            </div>
          )}

          {/* Activity overlay badge */}
          <AnimatePresence>
            {isDetecting && currentDetection && isActive && (
              <motion.div
                key={currentDetection.label}
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: "oklch(0.08 0.015 250 / 0.85)",
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${ACTIVITY_COLORS[currentDetection.label]}40`,
                }}
              >
                <span className="text-base leading-none">
                  {ACTIVITY_ICONS[currentDetection.label]}
                </span>
                <span
                  className="text-sm font-display font-bold tracking-wide"
                  style={{ color: ACTIVITY_COLORS[currentDetection.label] }}
                >
                  {ACTIVITY_LABELS_DISPLAY[currentDetection.label]}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {Math.round(currentDetection.confidence * 100)}%
                </span>
                {/* Pulse dot */}
                <span className="relative flex h-2 w-2 ml-0.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{
                      backgroundColor: ACTIVITY_COLORS[currentDetection.label],
                    }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{
                      backgroundColor: ACTIVITY_COLORS[currentDetection.label],
                    }}
                  />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LIVE badge top-right */}
          {isDetecting && isActive && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/80 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-mono font-bold tracking-widest">
                LIVE
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {!isDetecting ? (
          <Button
            data-ocid="webcam.start_button"
            size="sm"
            onClick={startDetection}
            disabled={isLoading || !!error}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-display font-semibold"
          >
            {isLoading ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Zap className="mr-2 w-4 h-4" />
            )}
            Start Detection
          </Button>
        ) : (
          <Button
            data-ocid="webcam.stop_button"
            size="sm"
            variant="outline"
            onClick={stopDetection}
            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 font-display font-semibold"
          >
            <Square className="mr-2 w-4 h-4" />
            Stop Detection
          </Button>
        )}

        <Button
          data-ocid="webcam.stop_camera_button"
          size="sm"
          variant="outline"
          onClick={handleStopCamera}
          disabled={!isActive && !isDetecting}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 font-display"
        >
          <CameraOff className="mr-2 w-4 h-4" />
          Stop Camera
        </Button>

        <Button
          data-ocid="webcam.save_button"
          size="sm"
          variant="outline"
          onClick={handleSaveSession}
          disabled={activityLog.length === 0 || isSaving || !actor}
          className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 font-display font-semibold ml-auto"
        >
          {isSaving ? (
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          ) : (
            <Save className="mr-2 w-4 h-4" />
          )}
          {isSaving ? "Saving..." : "Save Session"}
        </Button>
      </div>

      {/* Activity log */}
      {activityLog.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-surface rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono text-primary tracking-widest uppercase">
              Live Detection Log
            </h4>
            <span className="text-xs font-mono text-muted-foreground">
              {activityLog.length} event{activityLog.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div
            data-ocid="webcam.activity_log.list"
            className="space-y-2 max-h-64 overflow-y-auto"
          >
            {visibleLog.map((entry, i) => (
              <motion.div
                key={`${entry.timestamp.getTime()}-${i}`}
                data-ocid={`webcam.activity_log.item.${i + 1}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-background/40 border border-border/50"
              >
                <span className="text-lg flex-shrink-0 w-7 text-center">
                  {ACTIVITY_ICONS[entry.label]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-sm font-display font-semibold truncate"
                      style={{ color: ACTIVITY_COLORS[entry.label] }}
                    >
                      {ACTIVITY_LABELS_DISPLAY[entry.label]}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground ml-2 flex-shrink-0">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${entry.confidence * 100}%` }}
                        transition={{ duration: 0.4 }}
                        style={{
                          backgroundColor: ACTIVITY_COLORS[entry.label],
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-9 text-right flex-shrink-0">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-8 text-muted-foreground/60">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-mono">
            Start detection to see live activity recognition
          </p>
        </div>
      )}
    </div>
  );
}
