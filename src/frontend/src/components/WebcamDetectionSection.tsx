// Declare MediaPipe globals loaded from CDN
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Pose: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Camera: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawConnectors: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawLandmarks: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    POSE_CONNECTIONS: any;
  }
}

import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Camera,
  CameraOff,
  Clock,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Settings,
  Square,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useCamera } from "../camera/useCamera";
import { useActor } from "../hooks/useActor";
import { ActivityLabel, AnalysisStatus } from "../types/har";
import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  ACTIVITY_LABELS_DISPLAY,
} from "../utils/activityUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DetectionEntry {
  label: ActivityLabel;
  confidence: number;
  timestamp: Date;
}

// MediaPipe landmark indices
const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// ---------------------------------------------------------------------------
// Pose classification helpers
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Landmark = { x: number; y: number; z: number; visibility?: number };

function lm(landmarks: Landmark[], idx: number): Landmark {
  return landmarks[idx] ?? { x: 0, y: 0, z: 0, visibility: 0 };
}

function dist2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Angle at joint B formed by A-B-C (radians) */
function angleBetween(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (magAB * magCB === 0) return 0;
  return Math.acos(Math.min(1, Math.max(-1, dot / (magAB * magCB))));
}

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

interface ClassificationResult {
  label: ActivityLabel;
  confidence: number;
}

function classifyPose(
  landmarks: Landmark[],
  prevLandmarks: Landmark[] | null,
): ClassificationResult {
  const lShoulder = lm(landmarks, LM.LEFT_SHOULDER);
  const rShoulder = lm(landmarks, LM.RIGHT_SHOULDER);
  const lHip = lm(landmarks, LM.LEFT_HIP);
  const rHip = lm(landmarks, LM.RIGHT_HIP);
  const lKnee = lm(landmarks, LM.LEFT_KNEE);
  const rKnee = lm(landmarks, LM.RIGHT_KNEE);
  const lAnkle = lm(landmarks, LM.LEFT_ANKLE);
  const rAnkle = lm(landmarks, LM.RIGHT_ANKLE);
  const lWrist = lm(landmarks, LM.LEFT_WRIST);
  const rWrist = lm(landmarks, LM.RIGHT_WRIST);

  // Knee angles (hip-knee-ankle) in degrees
  const lKneeAngle = radToDeg(angleBetween(lHip, lKnee, lAnkle));
  const rKneeAngle = radToDeg(angleBetween(rHip, rKnee, rAnkle));
  const avgKneeAngle = (lKneeAngle + rKneeAngle) / 2;

  // Hip y relative to knee y (in normalized coords, higher y = lower on screen)
  const avgHipY = (lHip.y + rHip.y) / 2;
  const avgAnkleY = (lAnkle.y + rAnkle.y) / 2;
  const avgShoulderY = (lShoulder.y + rShoulder.y) / 2;

  // Wrist distances
  const wristDist = dist2D(lWrist, rWrist);
  const avgShoulderX = (lShoulder.x + rShoulder.x) / 2;
  const avgWristY = (lWrist.y + rWrist.y) / 2;

  // Movement delta from previous frame (speed proxy)
  let motionSpeed = 0;
  if (prevLandmarks) {
    const prevLKnee = lm(prevLandmarks, LM.LEFT_KNEE);
    const prevRKnee = lm(prevLandmarks, LM.RIGHT_KNEE);
    motionSpeed = dist2D(lKnee, prevLKnee) + dist2D(rKnee, prevRKnee);
  }

  // --- CLAPPING ---
  // Both wrists very close together AND in front of body at mid-height
  if (
    wristDist < 0.18 &&
    avgWristY > avgShoulderY && // hands below shoulders
    avgWristY < avgHipY + 0.1 && // hands above hips
    Math.abs(lWrist.x - avgShoulderX) < 0.35
  ) {
    const confidence = Math.max(0.6, Math.min(0.99, 1 - wristDist / 0.18));
    return { label: ActivityLabel.clapping, confidence };
  }

  // --- WAVING ---
  // One wrist significantly above its shoulder
  const lWristAboveShoulder = lShoulder.y - lWrist.y; // positive means wrist higher than shoulder
  const rWristAboveShoulder = rShoulder.y - rWrist.y;
  if (lWristAboveShoulder > 0.08 || rWristAboveShoulder > 0.08) {
    const lift = Math.max(lWristAboveShoulder, rWristAboveShoulder);
    const confidence = Math.max(0.6, Math.min(0.99, lift / 0.3));
    return { label: ActivityLabel.waving, confidence };
  }

  // --- STRETCHING ---
  // Both wrists above shoulders
  if (lWristAboveShoulder > 0.15 && rWristAboveShoulder > 0.15) {
    const lift = (lWristAboveShoulder + rWristAboveShoulder) / 2;
    const confidence = Math.max(0.6, Math.min(0.99, lift / 0.4));
    return { label: ActivityLabel.stretching, confidence };
  }

  // --- BENDING ---
  // Shoulder Y is much lower than hip Y (forward lean)
  const shoulderToHipDiff = avgHipY - avgShoulderY;
  if (shoulderToHipDiff < 0.12) {
    // shoulders nearly as low as hips — forward bend
    const confidence = Math.max(
      0.6,
      Math.min(0.99, 1 - shoulderToHipDiff / 0.2),
    );
    return { label: ActivityLabel.bending, confidence };
  }

  // --- SITTING ---
  // Hip y is high (close to bottom), knee angle roughly 80–120 degrees
  if (avgKneeAngle < 130 && avgHipY > 0.55) {
    const angleDeviation = Math.abs(avgKneeAngle - 90);
    const confidence = Math.max(0.6, Math.min(0.99, 1 - angleDeviation / 90));
    return { label: ActivityLabel.sitting, confidence };
  }

  // --- JUMPING ---
  // Both ankles are significantly elevated (y position is small = high on screen)
  // and knees are bent
  const ankleElevation = 1 - avgAnkleY; // higher value means ankles are higher on screen
  if (ankleElevation > 0.35 && avgKneeAngle < 160) {
    const confidence = Math.max(0.6, Math.min(0.99, ankleElevation / 0.6));
    return { label: ActivityLabel.jumping, confidence };
  }

  // --- WALKING / RUNNING ---
  // Significant asymmetry between left/right knee heights = alternating legs
  const kneeHeightDiff = Math.abs(lKnee.y - rKnee.y);
  if (kneeHeightDiff > 0.05 || motionSpeed > 0.015) {
    if (motionSpeed > 0.04) {
      // Running: high speed
      const confidence = Math.max(0.6, Math.min(0.99, motionSpeed / 0.08));
      return { label: ActivityLabel.running, confidence };
    }
    // Walking: moderate asymmetry / movement
    const confidence = Math.max(
      0.6,
      Math.min(0.99, (kneeHeightDiff + motionSpeed * 5) / 0.25),
    );
    return { label: ActivityLabel.walking, confidence };
  }

  // --- STANDING (default) ---
  // Upright posture, legs relatively straight
  const uprightScore = Math.min(1, avgKneeAngle / 160);
  const confidence = Math.max(0.6, Math.min(0.99, uprightScore));
  return { label: ActivityLabel.standing, confidence };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function formatDuration(startDate: Date | null): string {
  if (!startDate) return "0s";
  const seconds = Math.floor((Date.now() - startDate.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getMostFrequentActivity(log: DetectionEntry[]): ActivityLabel | null {
  if (log.length === 0) return null;
  const counts: Partial<Record<ActivityLabel, number>> = {};
  for (const entry of log) {
    counts[entry.label] = (counts[entry.label] ?? 0) + 1;
  }
  let max = 0;
  let maxLabel: ActivityLabel | null = null;
  for (const [label, count] of Object.entries(counts) as [
    ActivityLabel,
    number,
  ][]) {
    if (count > max) {
      max = count;
      maxLabel = label;
    }
  }
  return maxLabel;
}

function getErrorTitle(type: string): string {
  switch (type) {
    case "permission-blocked":
      return "Camera access blocked";
    case "permission":
      return "Camera permission not granted";
    case "not-found":
      return "No camera detected";
    case "not-supported":
      return "Camera not supported";
    case "overconstrained":
      return "Camera constraints failed";
    default:
      return "Camera access failed";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function WebcamDetectionSection() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const {
    isActive,
    isSupported,
    error,
    isLoading,
    startCamera,
    stopCamera,
    retry,
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
  const [poseUnavailable, setPoseUnavailable] = useState(false);
  const [, setTick] = useState(0);

  const sessionStartRef = useRef<Date | null>(null);
  const rafRef = useRef<number | null>(null);
  const poseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediapipePoseRef = useRef<any>(null);
  const isDetectingRef = useRef(false);
  const prevLandmarksRef = useRef<Landmark[] | null>(null);

  // Smoothing: track consecutive identical labels before committing
  const smoothingRef = useRef<{ label: ActivityLabel; count: number } | null>(
    null,
  );
  const SMOOTHING_FRAMES = 5;

  // Tick every 5s to refresh relative timestamps and session duration
  useEffect(() => {
    const ticker = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(ticker);
  }, []);

  // Draw pose skeleton on canvas overlay
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawSkeleton = useCallback(
    (results: any) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      // Size canvas to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (
        results.poseLandmarks &&
        window.drawConnectors &&
        window.drawLandmarks &&
        window.POSE_CONNECTIONS
      ) {
        window.drawConnectors(
          ctx,
          results.poseLandmarks,
          window.POSE_CONNECTIONS,
          {
            color: "rgba(0, 255, 200, 0.7)",
            lineWidth: 2,
          },
        );
        window.drawLandmarks(ctx, results.poseLandmarks, {
          color: "rgba(255, 100, 50, 0.9)",
          radius: 3,
        });
      }
    },
    [canvasRef, videoRef],
  );

  // Process pose results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onPoseResults = useCallback(
    (results: any) => {
      if (!isDetectingRef.current) return;

      drawSkeleton(results);

      if (!results.poseLandmarks || results.poseLandmarks.length === 0) return;

      const classified = classifyPose(
        results.poseLandmarks,
        prevLandmarksRef.current,
      );
      prevLandmarksRef.current = results.poseLandmarks;

      // Smoothing: only commit after SMOOTHING_FRAMES consecutive same label
      const smooth = smoothingRef.current;
      if (smooth && smooth.label === classified.label) {
        smooth.count++;
      } else {
        smoothingRef.current = { label: classified.label, count: 1 };
      }

      if ((smoothingRef.current?.count ?? 0) >= SMOOTHING_FRAMES) {
        smoothingRef.current = { label: classified.label, count: 0 };
        setCurrentDetection({
          label: classified.label,
          confidence: classified.confidence,
        });
        setActivityLog((prev) => {
          // Dedupe: don't log the same activity back-to-back within 3s
          const last = prev[0];
          if (
            last &&
            last.label === classified.label &&
            Date.now() - last.timestamp.getTime() < 3000
          ) {
            return prev;
          }
          return [
            {
              label: classified.label,
              confidence: classified.confidence,
              timestamp: new Date(),
            },
            ...prev,
          ];
        });
      }
    },
    [drawSkeleton],
  );

  // Initialize MediaPipe Pose
  const initMediaPipe = useCallback(async () => {
    if (!window.Pose) {
      setPoseUnavailable(true);
      return false;
    }

    try {
      const pose = new window.Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onPoseResults);
      await pose.initialize();
      mediapipePoseRef.current = pose;
      return true;
    } catch (err) {
      console.error("MediaPipe Pose init failed:", err);
      setPoseUnavailable(true);
      return false;
    }
  }, [onPoseResults]);

  // Detection loop using requestAnimationFrame
  const runDetectionLoop = useCallback(() => {
    if (!isDetectingRef.current) return;
    const video = videoRef.current;
    const pose = mediapipePoseRef.current;

    if (
      pose &&
      video &&
      video.readyState >= 2 &&
      !video.paused &&
      video.videoWidth > 0
    ) {
      pose.send({ image: video }).catch((err: unknown) => {
        console.warn("Pose send error:", err);
      });
    }

    // Schedule next frame with slight delay to avoid overwhelming MediaPipe
    poseRef.current = setTimeout(() => {
      rafRef.current = requestAnimationFrame(runDetectionLoop);
    }, 100) as unknown as ReturnType<typeof setTimeout>;
  }, [videoRef]);

  const stopDetectionLoop = useCallback(() => {
    isDetectingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (poseRef.current) {
      clearTimeout(poseRef.current);
      poseRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  const startDetection = useCallback(async () => {
    const cameraOk = isActive || (await startCamera());
    if (!cameraOk) return;

    if (!sessionStartRef.current) {
      sessionStartRef.current = new Date();
    }

    // Wait for video to be ready
    const video = videoRef.current;
    if (video && video.readyState < 2) {
      await new Promise<void>((resolve) => {
        const onReady = () => {
          video.removeEventListener("loadeddata", onReady);
          resolve();
        };
        video.addEventListener("loadeddata", onReady);
        setTimeout(resolve, 3000); // fallback timeout
      });
    }

    // Initialize MediaPipe if not already done
    if (!mediapipePoseRef.current) {
      const ok = await initMediaPipe();
      if (!ok) return;
    }

    // Show canvas overlay
    if (canvasRef.current) {
      canvasRef.current.style.display = "block";
      canvasRef.current.style.position = "absolute";
      canvasRef.current.style.top = "0";
      canvasRef.current.style.left = "0";
      canvasRef.current.style.width = "100%";
      canvasRef.current.style.height = "100%";
      canvasRef.current.style.pointerEvents = "none";
    }

    isDetectingRef.current = true;
    setIsDetecting(true);
    rafRef.current = requestAnimationFrame(runDetectionLoop);
  }, [
    isActive,
    startCamera,
    videoRef,
    canvasRef,
    initMediaPipe,
    runDetectionLoop,
  ]);

  const stopDetection = useCallback(() => {
    stopDetectionLoop();
    setCurrentDetection(null);
    prevLandmarksRef.current = null;
    smoothingRef.current = null;
    // Hide canvas
    if (canvasRef.current) {
      canvasRef.current.style.display = "none";
    }
  }, [stopDetectionLoop, canvasRef]);

  const handleStopCamera = useCallback(async () => {
    stopDetection();
    await stopCamera();
  }, [stopDetection, stopCamera]);

  const handleRetry = useCallback(async () => {
    const ok = await retry();
    if (ok) {
      await startDetection();
    }
  }, [retry, startDetection]);

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

      const results = activityLog
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
      isDetectingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (poseRef.current) clearTimeout(poseRef.current);
    };
  }, []);

  const visibleLog = activityLog.slice(0, 10);
  const mostFrequent = getMostFrequentActivity(activityLog);

  return (
    <div className="space-y-5">
      {/* Pose unavailable banner */}
      {poseUnavailable && (
        <div
          data-ocid="webcam.pose_unavailable_state"
          className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
        >
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-foreground">
            Pose detection unavailable — check your internet connection.
            MediaPipe could not be loaded from CDN.
          </p>
        </div>
      )}

      {/* Unsupported browser banner */}
      {isSupported === false && (
        <div
          data-ocid="webcam.unsupported_state"
          className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30"
        >
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-foreground">
            Your browser does not support camera access. Please use Chrome,
            Firefox, or Edge over HTTPS.
          </p>
        </div>
      )}

      {/* HTTPS hint for localhost dev */}
      {isSupported && !isActive && !isLoading && !error && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Info className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Camera access requires browser permission. When prompted, click{" "}
            <strong className="text-foreground">Allow</strong>. Pose estimation
            uses MediaPipe to detect activities like sitting, clapping, waving,
            walking, and more in real time.
          </p>
        </div>
      )}

      {/* Camera viewport */}
      <div
        className={`relative rounded-xl overflow-hidden glass-surface border transition-all duration-500 ${
          isDetecting
            ? "glow-border-cyan"
            : isActive
              ? "border-border/60"
              : "border-border/30"
        }`}
        style={{ minHeight: 280 }}
      >
        <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
          {/* Video element — always in DOM so videoRef is stable */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: isActive ? "block" : "none" }}
          />
          {/* Canvas overlay for skeleton drawing */}
          <canvas
            ref={canvasRef}
            data-ocid="webcam.canvas_target"
            style={{ display: "none" }}
          />

          {/* Inactive placeholder */}
          {!isActive && !isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
                <Camera className="w-9 h-9 text-primary/70" />
              </div>
              <p className="text-muted-foreground text-sm font-mono">
                Camera inactive — click Start Detection
              </p>
              <p className="text-muted-foreground/50 text-xs mt-1 font-mono">
                Real pose estimation via MediaPipe
              </p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div
              data-ocid="webcam.loading_state"
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/80"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-primary/80 text-sm font-mono tracking-wider">
                Requesting camera access...
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Please allow camera permission in the browser prompt
              </p>
            </div>
          )}

          {/* Error with retry */}
          {error && (
            <div
              data-ocid="webcam.error_state"
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 p-6 overflow-y-auto"
            >
              {error.type === "permission-blocked" ? (
                <div className="w-full max-w-sm text-center">
                  <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4 mx-auto">
                    <Lock className="w-6 h-6 text-destructive" />
                  </div>
                  <p className="text-foreground font-display font-semibold text-base mb-1">
                    Camera access blocked
                  </p>
                  <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
                    Your browser has blocked camera access for this site. Follow
                    these steps to unblock it:
                  </p>
                  <ol className="text-left space-y-2 mb-5">
                    {[
                      "Click the lock or camera icon in the browser address bar",
                      'Find "Camera" in the site permissions list',
                      'Change it from "Block" to "Allow"',
                      "Come back here and click the reload button below",
                    ].map((step, i) => (
                      <li key={step} className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-display font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <Button
                    data-ocid="webcam.reload_button"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full font-display font-semibold"
                  >
                    <Settings className="mr-2 w-4 h-4" />
                    I've allowed it — reload page
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4 mx-auto">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <p className="text-foreground font-display font-semibold mb-1">
                    {getErrorTitle(error.type)}
                  </p>
                  <p className="text-muted-foreground text-sm max-w-xs mb-4 leading-relaxed">
                    {error.actionHint ?? error.message}
                  </p>
                  {error.type !== "not-supported" && (
                    <Button
                      data-ocid="webcam.retry_button"
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="border-primary/40 text-primary hover:bg-primary/10"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 w-4 h-4" />
                      )}
                      {error.type === "permission"
                        ? "Allow Camera Access"
                        : "Try Again"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Detected activity overlay badge */}
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
                  background: "oklch(0.08 0.015 250 / 0.88)",
                  backdropFilter: "blur(10px)",
                  border: `1px solid ${ACTIVITY_COLORS[currentDetection.label]}50`,
                  boxShadow: `0 0 16px ${ACTIVITY_COLORS[currentDetection.label]}25`,
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

          {/* LIVE badge */}
          {isDetecting && isActive && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/80 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-mono font-bold tracking-widest">
                LIVE
              </span>
            </div>
          )}

          {/* Pose detection label (top-left) */}
          {isDetecting && isActive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30">
              <span className="text-primary text-xs font-mono font-semibold tracking-wide">
                MediaPipe Pose
              </span>
            </div>
          )}

          {/* Scan-line overlay when detecting */}
          {isDetecting && isActive && (
            <div
              className="absolute inset-0 pointer-events-none scan-line opacity-20"
              aria-hidden
            />
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
            disabled={isLoading || isSupported === false}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-display font-semibold"
          >
            {isLoading ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Zap className="mr-2 w-4 h-4" />
            )}
            {isLoading ? "Starting..." : "Start Detection"}
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
            Pause Detection
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

        {/* Standalone retry when in error state */}
        {error &&
          !isLoading &&
          error.type !== "permission-blocked" &&
          error.type !== "not-supported" && (
            <Button
              data-ocid="webcam.retry_controls_button"
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="border-primary/40 text-primary hover:bg-primary/10 font-display"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              {error.type === "permission"
                ? "Allow Camera Access"
                : "Try Again"}
            </Button>
          )}

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

      {/* Session stats */}
      <AnimatePresence>
        {activityLog.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            data-ocid="webcam.session_stats"
            className="grid grid-cols-3 gap-3"
          >
            <div className="glass-surface rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-xs font-mono uppercase tracking-wider">
                  Detections
                </span>
              </div>
              <span
                data-ocid="webcam.stats.detections"
                className="text-2xl font-display font-bold text-primary glow-cyan-text"
              >
                {activityLog.length}
              </span>
            </div>

            <div className="glass-surface rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-mono uppercase tracking-wider">
                  Top Activity
                </span>
              </div>
              {mostFrequent ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-base leading-none">
                    {ACTIVITY_ICONS[mostFrequent]}
                  </span>
                  <span
                    data-ocid="webcam.stats.top_activity"
                    className="text-sm font-display font-bold truncate"
                    style={{ color: ACTIVITY_COLORS[mostFrequent] }}
                  >
                    {ACTIVITY_LABELS_DISPLAY[mostFrequent]}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground font-mono">
                  —
                </span>
              )}
            </div>

            <div className="glass-surface rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-mono uppercase tracking-wider">
                  Duration
                </span>
              </div>
              <span
                data-ocid="webcam.stats.duration"
                className="text-2xl font-display font-bold text-foreground"
              >
                {formatDuration(sessionStartRef.current)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            className="space-y-2 max-h-64 overflow-y-auto pr-1"
          >
            {visibleLog.map((entry, i) => (
              <motion.div
                key={`${entry.timestamp.getTime()}-${i}`}
                data-ocid={`webcam.activity_log.item.${i + 1}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.2) }}
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

          {activityLog.length > 10 && (
            <p className="text-xs font-mono text-muted-foreground/60 text-center mt-3">
              Showing latest 10 of {activityLog.length} detections
            </p>
          )}
        </motion.div>
      ) : (
        <div
          data-ocid="webcam.empty_state"
          className="text-center py-8 text-muted-foreground/60"
        >
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-mono">
            Start detection to see real-time pose-based activity recognition
          </p>
          <p className="text-xs font-mono mt-1 opacity-60">
            Detects: sitting, standing, walking, running, clapping, waving,
            jumping, bending, stretching
          </p>
        </div>
      )}
    </div>
  );
}
