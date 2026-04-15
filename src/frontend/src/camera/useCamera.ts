import { useCallback, useEffect, useRef, useState } from "react";

export interface CameraConfig {
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
  quality?: number;
  format?: "image/jpeg" | "image/png" | "image/webp";
}

export type CameraPermissionState = "unknown" | "granted" | "prompt" | "denied";

export interface CameraError {
  type:
    | "permission"
    | "permission-blocked"
    | "not-supported"
    | "not-found"
    | "overconstrained"
    | "unknown";
  message: string;
  actionHint?: string;
}

export const useCamera = (config: CameraConfig = {}) => {
  const {
    facingMode = "user",
    width = 1280,
    height = 720,
    quality = 0.8,
    format = "image/jpeg",
  } = config;

  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState(facingMode);
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>("unknown");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  // Check browser support on mount
  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";
    setIsSupported(supported);
  }, []);

  // Mark unmounted and stop stream on cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopAllTracks();
    };
  }, []);

  /** Stop all tracks without touching React state (safe to call after unmount) */
  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopAllTracks();
    if (isMountedRef.current) {
      setIsActive(false);
    }
  }, [stopAllTracks]);

  /** Query the Permissions API for the camera permission state */
  const queryPermission =
    useCallback(async (): Promise<CameraPermissionState> => {
      if (
        typeof navigator === "undefined" ||
        !navigator.permissions ||
        typeof navigator.permissions.query !== "function"
      ) {
        return "unknown";
      }
      try {
        const result = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        const state = result.state as CameraPermissionState;
        if (isMountedRef.current) setPermissionState(state);
        return state;
      } catch {
        return "unknown";
      }
    }, []);

  /** Build constraints with graceful fallback if exact facing mode is overconstrained */
  const buildConstraints = useCallback(
    (facing: "user" | "environment") => ({
      video: {
        facingMode: { ideal: facing },
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    }),
    [width, height],
  );

  const createMediaStream = useCallback(
    async (facing: "user" | "environment"): Promise<MediaStream> => {
      // First attempt with ideal facing mode
      try {
        return await navigator.mediaDevices.getUserMedia(
          buildConstraints(facing),
        );
      } catch (firstErr: unknown) {
        const err = firstErr as { name?: string };
        // If overconstrained, try with just video: true (any camera)
        if (
          err?.name === "OverconstrainedError" ||
          err?.name === "ConstraintNotSatisfiedError"
        ) {
          return await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        throw firstErr;
      }
    },
    [buildConstraints],
  );

  const setupVideo = useCallback((stream: MediaStream): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) {
        resolve(false);
        return;
      }

      // Ensure required attributes for autoplay in browsers
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.srcObject = stream;

      const onLoaded = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onErr);
        video
          .play()
          .then(() => resolve(true))
          .catch((playErr) => {
            // NotAllowedError from autoplay policy — still resolve true; stream is attached
            console.warn("video.play() blocked (autoplay policy):", playErr);
            resolve(true);
          });
      };

      const onErr = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onErr);
        resolve(false);
      };

      // If metadata already ready (readyState >= HAVE_METADATA)
      if (video.readyState >= 1) {
        onLoaded();
      } else {
        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("error", onErr);
      }

      // Timeout guard: if neither event fires in 8s something is wrong
      setTimeout(() => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onErr);
        // Resolve anyway — stream might still work
        if (video.srcObject) resolve(true);
        else resolve(false);
      }, 8000);
    });
  }, []);

  const parseError = useCallback(
    async (err: unknown): Promise<CameraError> => {
      const e = err as { name?: string; message?: string };
      if (
        e?.name === "NotAllowedError" ||
        e?.name === "PermissionDeniedError"
      ) {
        // Re-query the actual permission state to distinguish blocked vs. dismissed
        const pState = await queryPermission();
        if (pState === "denied") {
          return {
            type: "permission-blocked",
            message: "Camera access is blocked by your browser.",
            actionHint:
              "You need to update your browser settings to allow camera access.",
          };
        }
        // permission is 'prompt' — user dismissed/denied the dialog this time
        return {
          type: "permission",
          message: "Camera permission was not granted.",
          actionHint:
            "Click 'Allow Camera Access' below and then click Allow in the browser prompt.",
        };
      }
      if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError") {
        return {
          type: "not-found",
          message: "No camera device detected.",
          actionHint: "Connect a webcam and click Try Again.",
        };
      }
      if (e?.name === "NotSupportedError") {
        return {
          type: "not-supported",
          message: "Camera API is not supported in this browser.",
          actionHint: "Please use Chrome, Firefox, or Edge over HTTPS.",
        };
      }
      if (
        e?.name === "OverconstrainedError" ||
        e?.name === "ConstraintNotSatisfiedError"
      ) {
        return {
          type: "overconstrained",
          message: "Camera could not satisfy the requested constraints.",
          actionHint: "Try again — the app will use any available camera.",
        };
      }
      return {
        type: "unknown",
        message: e?.message ?? "Failed to access camera.",
        actionHint: "Please check your camera and try again.",
      };
    },
    [queryPermission],
  );

  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    if (isSupported === false) return false;
    if (isLoading) return false;

    setIsLoading(true);
    setError(null);

    try {
      // Pre-check permission state before attempting getUserMedia
      const pState = await queryPermission();
      if (!isMountedRef.current) return false;

      if (pState === "denied") {
        setError({
          type: "permission-blocked",
          message: "Camera access is blocked by your browser.",
          actionHint:
            "You need to update your browser settings to allow camera access.",
        });
        return false;
      }

      // Stop any existing stream first
      stopAllTracks();
      if (isMountedRef.current) setIsActive(false);

      const stream = await createMediaStream(currentFacingMode);

      // After getUserMedia succeeds, update permission state
      if (isMountedRef.current) setPermissionState("granted");

      // Guard against unmount during async getUserMedia call
      if (!isMountedRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return false;
      }

      streamRef.current = stream;
      const success = await setupVideo(stream);

      if (!isMountedRef.current) {
        stopAllTracks();
        return false;
      }

      if (success) {
        setIsActive(true);
        return true;
      }

      cleanup();
      return false;
    } catch (err) {
      if (isMountedRef.current) {
        const parsed = await parseError(err);
        setError(parsed);
      }
      stopAllTracks();
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    isSupported,
    isLoading,
    currentFacingMode,
    queryPermission,
    createMediaStream,
    setupVideo,
    parseError,
    cleanup,
    stopAllTracks,
  ]);

  const stopCamera = useCallback(async (): Promise<void> => {
    cleanup();
    // Tiny delay to ensure browser releases the hardware
    await new Promise((r) => setTimeout(r, 150));
    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }, [cleanup]);

  const switchCamera = useCallback(
    async (newFacingMode?: "user" | "environment"): Promise<boolean> => {
      if (isSupported === false || isLoading) return false;

      const target =
        newFacingMode ??
        (currentFacingMode === "user" ? "environment" : "user");

      cleanup();
      setCurrentFacingMode(target);

      // Brief pause so stream is fully released before re-requesting
      await new Promise((r) => setTimeout(r, 200));

      if (!isMountedRef.current) return false;

      setIsLoading(true);
      setError(null);

      try {
        const stream = await createMediaStream(target);

        if (!isMountedRef.current) {
          for (const track of stream.getTracks()) track.stop();
          return false;
        }

        streamRef.current = stream;
        const success = await setupVideo(stream);

        if (!isMountedRef.current) {
          stopAllTracks();
          return false;
        }

        if (success) {
          setIsActive(true);
          return true;
        }

        cleanup();
        return false;
      } catch (err) {
        if (isMountedRef.current) {
          const parsed = await parseError(err);
          setError(parsed);
        }
        stopAllTracks();
        return false;
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    },
    [
      isSupported,
      isLoading,
      currentFacingMode,
      cleanup,
      createMediaStream,
      setupVideo,
      parseError,
      stopAllTracks,
    ],
  );

  const retry = useCallback(async (): Promise<boolean> => {
    if (isLoading) return false;

    // Check current permission state — if still blocked, show settings error immediately
    const pState = await queryPermission();
    if (pState === "denied") {
      if (isMountedRef.current) {
        setError({
          type: "permission-blocked",
          message: "Camera access is blocked by your browser.",
          actionHint:
            "You need to update your browser settings to allow camera access.",
        });
      }
      return false;
    }

    setError(null);
    cleanup();
    // Give the browser a moment to fully release hardware
    await new Promise((r) => setTimeout(r, 400));
    if (!isMountedRef.current) return false;
    return startCamera();
  }, [isLoading, queryPermission, cleanup, startCamera]);

  const capturePhoto = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current || !isActive) {
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || width;
      canvas.height = video.videoHeight || height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      if (currentFacingMode === "user") {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0);
      } else {
        ctx.drawImage(video, 0, 0);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ext = format.split("/")[1];
            resolve(
              new File([blob], `photo_${Date.now()}.${ext}`, { type: format }),
            );
          } else {
            resolve(null);
          }
        },
        format,
        quality,
      );
    });
  }, [isActive, format, quality, currentFacingMode, width, height]);

  return {
    isActive,
    isSupported,
    error,
    isLoading,
    currentFacingMode,
    permissionState,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    retry,
    videoRef,
    canvasRef,
  };
};
