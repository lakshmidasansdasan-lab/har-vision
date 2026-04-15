import { ActivityLabel } from "../types/har";
import type { ActivityResult } from "../types/har";

export const ACTIVITY_ICONS: Record<ActivityLabel, string> = {
  [ActivityLabel.walking]: "👟",
  [ActivityLabel.running]: "🏃",
  [ActivityLabel.clapping]: "👏",
  [ActivityLabel.waving]: "👋",
  [ActivityLabel.jumping]: "⬆️",
  [ActivityLabel.sitting]: "🪑",
  [ActivityLabel.standing]: "🧍",
  [ActivityLabel.smiling]: "😊",
  [ActivityLabel.bending]: "🔄",
  [ActivityLabel.stretching]: "🤸",
};

export const ACTIVITY_COLORS: Record<ActivityLabel, string> = {
  [ActivityLabel.walking]: "oklch(0.72 0.20 195)",
  [ActivityLabel.running]: "oklch(0.70 0.22 160)",
  [ActivityLabel.clapping]: "oklch(0.75 0.18 270)",
  [ActivityLabel.waving]: "oklch(0.73 0.20 230)",
  [ActivityLabel.jumping]: "oklch(0.72 0.21 35)",
  [ActivityLabel.sitting]: "oklch(0.68 0.18 290)",
  [ActivityLabel.standing]: "oklch(0.74 0.16 200)",
  [ActivityLabel.smiling]: "oklch(0.75 0.20 320)",
  [ActivityLabel.bending]: "oklch(0.70 0.19 25)",
  [ActivityLabel.stretching]: "oklch(0.72 0.19 130)",
};

export const ACTIVITY_LABELS_DISPLAY: Record<ActivityLabel, string> = {
  [ActivityLabel.walking]: "Walking",
  [ActivityLabel.running]: "Running",
  [ActivityLabel.clapping]: "Clapping",
  [ActivityLabel.waving]: "Waving",
  [ActivityLabel.jumping]: "Jumping",
  [ActivityLabel.sitting]: "Sitting",
  [ActivityLabel.standing]: "Standing",
  [ActivityLabel.smiling]: "Smiling",
  [ActivityLabel.bending]: "Bending",
  [ActivityLabel.stretching]: "Stretching",
};

export const DEMO_RESULTS: ActivityResult[] = [
  {
    activityLabel: ActivityLabel.walking,
    confidence: 0.92,
    startTime: 0,
    endTime: 5,
  },
  {
    activityLabel: ActivityLabel.standing,
    confidence: 0.87,
    startTime: 5,
    endTime: 9,
  },
  {
    activityLabel: ActivityLabel.waving,
    confidence: 0.78,
    startTime: 9,
    endTime: 13,
  },
  {
    activityLabel: ActivityLabel.running,
    confidence: 0.95,
    startTime: 13,
    endTime: 20,
  },
  {
    activityLabel: ActivityLabel.clapping,
    confidence: 0.83,
    startTime: 20,
    endTime: 25,
  },
];

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatFileSize(bytes: bigint): string {
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(time: bigint): string {
  // time is in nanoseconds from ICP
  const ms = Number(time) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
