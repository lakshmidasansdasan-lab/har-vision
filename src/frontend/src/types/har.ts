/**
 * HAR Vision local types.
 * These types are defined locally since the backend candid interface
 * currently has an empty service — all persistence is handled by useActor.ts.
 */

export enum ActivityLabel {
  walking = "walking",
  running = "running",
  clapping = "clapping",
  waving = "waving",
  jumping = "jumping",
  sitting = "sitting",
  standing = "standing",
  smiling = "smiling",
  bending = "bending",
  stretching = "stretching",
}

export enum AnalysisStatus {
  pending = "pending",
  processing = "processing",
  completed = "completed",
  failed = "failed",
}

export interface VideoAnalysis {
  id: bigint;
  filename: string;
  fileSize: bigint;
  duration: number;
  submittedAt: bigint;
  status: AnalysisStatus;
}

export interface ActivityResult {
  activityLabel: ActivityLabel;
  confidence: number;
  startTime: number;
  endTime: number;
}
