import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import type { ActivityResult } from "../types/har";
import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  ACTIVITY_LABELS_DISPLAY,
  formatTime,
} from "../utils/activityUtils";

interface ResultsPanelProps {
  results: ActivityResult[];
  analysisId: bigint;
  onReset: () => void;
  filename?: string;
  duration?: number;
}

export default function ResultsPanel({
  results,
  analysisId,
  onReset,
  filename,
  duration: propDuration,
}: ResultsPanelProps) {
  const totalDuration =
    propDuration ??
    (results.length > 0 ? Math.max(...results.map((r) => r.endTime)) : 30);
  const sortedResults = [...results].sort((a, b) => a.startTime - b.startTime);
  const avgConfidence =
    results.length > 0
      ? Math.round(
          (results.reduce((s, r) => s + r.confidence, 0) / results.length) *
            100,
        )
      : 0;
  const topActivity = [...results].sort(
    (a, b) => b.confidence - a.confidence,
  )[0];

  return (
    <div className="space-y-6" data-ocid="results.panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center glow-cyan">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-foreground">
              Analysis Complete
            </h3>
            <p className="text-muted-foreground text-sm font-mono">
              ID:{" "}
              <span className="text-primary/70">
                {analysisId.toString().slice(0, 10)}…
              </span>
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          data-ocid="results.reset_button"
          className="border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          <RefreshCw className="mr-2 w-3.5 h-3.5" />
          Analyze New Video
        </Button>
      </div>

      {/* Summary Stats */}
      <Card
        className="glass-surface border-primary/20 glow-border-cyan"
        data-ocid="results.summary.card"
      >
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryItem
              icon={<Activity className="w-4 h-4 text-primary" />}
              label="Activities"
              value={`${results.length}`}
            />
            <SummaryItem
              icon={<Clock className="w-4 h-4 text-primary" />}
              label="Duration"
              value={formatTime(totalDuration)}
            />
            <SummaryItem
              icon={<BarChart3 className="w-4 h-4 text-primary" />}
              label="Avg Confidence"
              value={`${avgConfidence}%`}
            />
            <SummaryItem
              icon={<TrendingUp className="w-4 h-4 text-primary" />}
              label="Top Activity"
              value={
                topActivity
                  ? `${ACTIVITY_ICONS[topActivity.activityLabel]} ${ACTIVITY_LABELS_DISPLAY[topActivity.activityLabel]}`
                  : "—"
              }
            />
          </div>
          {filename && (
            <p className="mt-4 pt-4 border-t border-border/40 text-xs font-mono text-muted-foreground truncate">
              <span className="text-primary/50 mr-1">FILE</span> {filename}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card
        className="glass-surface border-border"
        data-ocid="results.timeline.card"
      >
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <ActivityTimeline
            results={sortedResults}
            totalDuration={totalDuration}
          />
        </CardContent>
      </Card>

      {/* Detected Activities */}
      <div data-ocid="results.activities.list">
        <h4 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Detected Activities
          <span className="text-xs font-mono text-muted-foreground ml-1">
            ({results.length})
          </span>
        </h4>
        {results.length === 0 ? (
          <div
            className="text-center py-10 text-muted-foreground glass-surface rounded-xl border border-border"
            data-ocid="results.activities.empty_state"
          >
            <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm">No activities detected</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedResults.map((result, idx) => (
              <ActivityCard
                key={`${result.activityLabel}-${result.startTime}`}
                result={result}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display font-bold text-lg text-foreground leading-tight truncate">
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function ActivityTimeline({
  results,
  totalDuration,
}: { results: ActivityResult[]; totalDuration: number }) {
  return (
    <div>
      {/* Timeline bar */}
      <div className="relative h-14 rounded-lg overflow-hidden bg-muted/40 border border-border/50">
        {results.map((result, timelineIdx) => {
          const left = (result.startTime / totalDuration) * 100;
          const width =
            ((result.endTime - result.startTime) / totalDuration) * 100;
          const color = ACTIVITY_COLORS[result.activityLabel];

          return (
            <motion.div
              key={`${result.activityLabel}-${result.startTime}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: timelineIdx * 0.1 }}
              style={{
                position: "absolute",
                left: `${left}%`,
                width: `${width}%`,
                top: 0,
                bottom: 0,
                background: color,
                opacity: 0.85,
                transformOrigin: "left",
              }}
              className="flex items-center justify-center overflow-hidden"
              title={`${ACTIVITY_LABELS_DISPLAY[result.activityLabel]} (${result.startTime}s – ${result.endTime}s)`}
            >
              {width > 8 && (
                <span className="text-sm drop-shadow px-1 truncate">
                  {ACTIVITY_ICONS[result.activityLabel]}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground font-mono mt-1.5">
        <span>0s</span>
        <span>{formatTime(totalDuration / 2)}</span>
        <span>{formatTime(totalDuration)}</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-border/40">
        {results.map((result) => (
          <div
            key={`legend-${result.activityLabel}-${result.startTime}`}
            className="flex items-center gap-1.5"
          >
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: ACTIVITY_COLORS[result.activityLabel] }}
            />
            <span className="text-xs text-muted-foreground">
              {ACTIVITY_LABELS_DISPLAY[result.activityLabel]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityCard({
  result,
  index,
}: { result: ActivityResult; index: number }) {
  const icon = ACTIVITY_ICONS[result.activityLabel];
  const label = ACTIVITY_LABELS_DISPLAY[result.activityLabel];
  const color = ACTIVITY_COLORS[result.activityLabel];
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      data-ocid={`results.activities.item.${index + 1}`}
    >
      <Card className="glass-surface border-border hover:border-primary/30 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{icon}</span>
              <div>
                <h4 className="font-display font-semibold text-foreground">
                  {label}
                </h4>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatTime(result.startTime)} – {formatTime(result.endTime)}
                </p>
              </div>
            </div>
            <Badge
              className="text-xs font-mono flex-shrink-0"
              style={{
                backgroundColor: `${color}20`,
                color: color,
                borderColor: `${color}40`,
                border: "1px solid",
              }}
              data-ocid={`results.activities.confidence.${index + 1}`}
            >
              {confidencePct}%
            </Badge>
          </div>

          {/* Confidence bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Confidence</span>
              <span className="font-mono">{confidencePct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidencePct}%` }}
                transition={{ duration: 0.6, delay: index * 0.07 + 0.2 }}
                className="h-full rounded-full"
                style={{
                  background: color,
                  boxShadow: `0 0 8px ${color}50`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
