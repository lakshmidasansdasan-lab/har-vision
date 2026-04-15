import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Clock,
  FileVideo,
  History,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useDeleteAnalysis,
  useGetActivityResults,
  useGetAllAnalyses,
} from "../../hooks/useQueries";
import { AnalysisStatus } from "../../types/har";
import type { ActivityResult, VideoAnalysis } from "../../types/har";
import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  ACTIVITY_LABELS_DISPLAY,
  formatDate,
  formatFileSize,
  formatTime,
} from "../../utils/activityUtils";

const STATUS_CONFIG: Record<
  AnalysisStatus,
  { label: string; className: string }
> = {
  [AnalysisStatus.pending]: {
    label: "Pending",
    className: "bg-muted/50 text-muted-foreground border-border",
  },
  [AnalysisStatus.processing]: {
    label: "Processing",
    className: "bg-yellow-900/40 text-yellow-300 border-yellow-600/40",
  },
  [AnalysisStatus.completed]: {
    label: "Completed",
    className: "bg-emerald-900/40 text-emerald-300 border-emerald-600/40",
  },
  [AnalysisStatus.failed]: {
    label: "Failed",
    className: "bg-red-900/40 text-red-300 border-red-600/40",
  },
};

function ActivityResultsExpanded({
  analysisId,
}: {
  analysisId: bigint;
}) {
  const { data: results, isLoading } = useGetActivityResults(analysisId);

  if (isLoading) {
    return (
      <div
        className="flex gap-3 py-4 px-1 flex-wrap"
        data-ocid="history.results.loading_state"
      >
        {(["sk-a", "sk-b", "sk-c"] as const).map((k) => (
          <Skeleton key={k} className="h-24 w-40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div
        className="py-6 text-center text-muted-foreground text-sm"
        data-ocid="history.results.empty_state"
      >
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No activity results recorded</p>
      </div>
    );
  }

  return (
    <div className="py-4 px-1" data-ocid="history.results.panel">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
        Detected Activities ({results.length})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {results.map((result: ActivityResult, idx: number) => {
          const color = ACTIVITY_COLORS[result.activityLabel];
          const icon = ACTIVITY_ICONS[result.activityLabel];
          const label = ACTIVITY_LABELS_DISPLAY[result.activityLabel];
          const pct = Math.round(result.confidence * 100);
          return (
            <motion.div
              key={`${result.activityLabel}-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-surface rounded-lg p-3 flex flex-col gap-2"
              style={{ borderColor: `${color}40` }}
              data-ocid={`history.activity_card.${idx + 1}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-mono font-bold" style={{ color }}>
                  {pct}%
                </span>
              </div>
              <p className="text-xs font-semibold text-foreground truncate">
                {label}
              </p>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.05 + 0.1 }}
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {formatTime(result.startTime)} – {formatTime(result.endTime)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function AnalysisRow({
  analysis,
  rowIndex,
  onDelete,
}: {
  analysis: VideoAnalysis;
  rowIndex: number;
  onDelete: (id: bigint) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isClickable = analysis.status === AnalysisStatus.completed;
  const statusCfg = STATUS_CONFIG[analysis.status];

  const handleRowClick = () => {
    if (isClickable) setExpanded((p) => !p);
  };

  return (
    <>
      <TableRow
        className={`border-border/60 transition-colors group ${
          isClickable ? "cursor-pointer hover:bg-primary/5" : ""
        }`}
        onClick={handleRowClick}
        data-ocid={`history.row.${rowIndex + 1}`}
      >
        {/* Expand chevron */}
        <TableCell className="w-8 p-2 pl-4">
          {isClickable && (
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.18 }}
              className="text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          )}
        </TableCell>

        {/* Filename */}
        <TableCell className="py-3 font-mono text-sm min-w-0">
          <div className="flex items-center gap-2">
            <FileVideo className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span
              className="truncate max-w-[140px] sm:max-w-xs text-foreground"
              title={analysis.filename}
            >
              {analysis.filename}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 ml-5">
            {formatFileSize(analysis.fileSize)} ·{" "}
            {formatTime(analysis.duration)}
          </div>
        </TableCell>

        {/* Upload date */}
        <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 shrink-0" />
            {formatDate(analysis.submittedAt)}
          </div>
        </TableCell>

        {/* Activity count */}
        <TableCell
          className="py-3 text-center hidden md:table-cell"
          data-ocid={`history.activity_count.${rowIndex + 1}`}
        >
          {analysis.status === AnalysisStatus.completed ? (
            <span className="text-sm font-mono text-primary">—</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Status */}
        <TableCell className="py-3">
          <Badge
            variant="outline"
            className={`text-xs font-mono ${statusCfg.className}`}
            data-ocid={`history.status_badge.${rowIndex + 1}`}
          >
            {analysis.status === AnalysisStatus.processing && (
              <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
            )}
            {statusCfg.label}
          </Badge>
        </TableCell>

        {/* Delete */}
        <TableCell className="py-3 text-right pr-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete analysis"
                data-ocid={`history.delete_button.${rowIndex + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-surface border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">
                  Delete Analysis
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Delete analysis for{" "}
                  <span className="font-mono text-foreground">
                    {analysis.filename}
                  </span>
                  ? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="border-border hover:border-primary/40"
                  data-ocid={`history.cancel_button.${rowIndex + 1}`}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(analysis.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-ocid={`history.confirm_button.${rowIndex + 1}`}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      </TableRow>

      {/* Expanded activity results */}
      <AnimatePresence>
        {expanded && (
          <TableRow
            className="border-border/40 bg-primary/[0.03]"
            data-ocid={`history.expanded_row.${rowIndex + 1}`}
          >
            <TableCell colSpan={6} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden px-4"
              >
                <ActivityResultsExpanded analysisId={analysis.id} />
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}

export default function HistorySection() {
  const { data: analyses, isLoading, refetch } = useGetAllAnalyses(0n, 20n);
  const deleteMutation = useDeleteAnalysis();

  const handleDelete = async (id: bigint) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Analysis deleted successfully.");
    } catch {
      toast.error("Failed to delete analysis.");
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6" data-ocid="history.section">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono tracking-widest mb-3">
              <History className="w-3 h-3" />
              PAST ANALYSES
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">
              Analysis History
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Click any completed row to expand and view activity results
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="border-border text-muted-foreground hover:text-foreground hover:border-primary/40 shrink-0"
            data-ocid="history.refresh_button"
          >
            {isLoading ? (
              <Loader2 className="mr-2 w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 w-3.5 h-3.5" />
            )}
            Refresh
          </Button>
        </motion.div>

        {/* Table card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-surface rounded-xl border border-border/60 overflow-hidden"
          data-ocid="history.table"
        >
          {isLoading ? (
            <div className="p-6 space-y-3" data-ocid="history.loading_state">
              {(["sk-1", "sk-2", "sk-3", "sk-4"] as const).map((k) => (
                <Skeleton
                  key={k}
                  className="h-12 w-full rounded-lg bg-muted/40"
                />
              ))}
            </div>
          ) : !analyses || analyses.length === 0 ? (
            <div
              className="py-16 px-6 text-center"
              data-ocid="history.empty_state"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mx-auto mb-4">
                <History className="w-7 h-7 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                No analyses yet
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Upload a video above to start recognizing human activities with
                our deep-learning pipeline.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent bg-muted/10">
                    <TableHead className="w-8" />
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                      File
                    </TableHead>
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                      Upload Date
                    </TableHead>
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider text-center hidden md:table-cell">
                      Activities
                    </TableHead>
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.map((analysis, idx) => (
                    <AnalysisRow
                      key={analysis.id.toString()}
                      analysis={analysis}
                      rowIndex={idx}
                      onDelete={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  {analyses.length} record
                  {analyses.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    disabled
                    data-ocid="history.pagination_prev"
                  >
                    ← Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    disabled
                    data-ocid="history.pagination_next"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
