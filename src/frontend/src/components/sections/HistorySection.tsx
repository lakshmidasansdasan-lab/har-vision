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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AnalysisStatus } from "../../backend";
import type { ActivityResult, VideoAnalysis } from "../../backend.d.ts";
import { useActor } from "../../hooks/useActor";
import { useDeleteAnalysis, useGetAllAnalyses } from "../../hooks/useQueries";
import {
  formatDate,
  formatFileSize,
  formatTime,
} from "../../utils/activityUtils";
import ResultsPanel from "../ResultsPanel";

function StatusBadge({ status }: { status: AnalysisStatus }) {
  const config: Record<AnalysisStatus, { label: string; className: string }> = {
    [AnalysisStatus.pending]: {
      label: "Pending",
      className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    },
    [AnalysisStatus.processing]: {
      label: "Processing",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    },
    [AnalysisStatus.completed]: {
      label: "Completed",
      className: "bg-primary/15 text-primary border-primary/30",
    },
    [AnalysisStatus.failed]: {
      label: "Failed",
      className: "bg-destructive/15 text-destructive border-destructive/30",
    },
  };

  const { label, className } = config[status];

  return (
    <Badge variant="outline" className={`text-xs font-mono ${className}`}>
      {status === AnalysisStatus.processing && (
        <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
      )}
      {label}
    </Badge>
  );
}

function AnalysisRow({
  analysis,
  onDelete,
}: {
  analysis: VideoAnalysis;
  onDelete: (id: bigint) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<ActivityResult[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const { actor } = useActor();

  const toggleExpand = async () => {
    if (analysis.status !== AnalysisStatus.completed) return;

    if (!expanded && results === null) {
      setLoadingResults(true);
      try {
        const data = await actor?.getActivityResults(analysis.id);
        setResults(data ?? []);
      } catch (err) {
        toast.error("Failed to load activity results.");
        console.error(err);
      } finally {
        setLoadingResults(false);
      }
    }
    setExpanded((prev) => !prev);
  };

  const isClickable = analysis.status === AnalysisStatus.completed;

  return (
    <>
      <TableRow
        className={`border-border transition-colors ${isClickable ? "cursor-pointer hover:bg-primary/5" : ""}`}
        onClick={isClickable ? toggleExpand : undefined}
      >
        <TableCell className="w-8 p-2">
          {isClickable && (
            <div className="text-muted-foreground">
              {loadingResults ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="font-mono text-sm">
          <div className="flex items-center gap-2">
            <FileVideo className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-xs text-foreground">
              {analysis.filename}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatFileSize(analysis.fileSize)} ·{" "}
            {formatTime(analysis.duration)}
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {formatDate(analysis.submittedAt)}
          </div>
        </TableCell>
        <TableCell>
          <StatusBadge status={analysis.status} />
        </TableCell>
        <TableCell className="text-right">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
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
                  Are you sure you want to delete the analysis for{" "}
                  <span className="font-mono text-foreground">
                    {analysis.filename}
                  </span>
                  ? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border hover:border-primary/40">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(analysis.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      </TableRow>

      {/* Expanded results */}
      {expanded && results !== null && (
        <TableRow className="border-border bg-primary/3 hover:bg-primary/3">
          <TableCell colSpan={5} className="p-4">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ResultsPanel
                  results={results}
                  analysisId={analysis.id}
                  onReset={() => setExpanded(false)}
                  filename={analysis.filename}
                  duration={analysis.duration}
                />
              </motion.div>
            </AnimatePresence>
          </TableCell>
        </TableRow>
      )}
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
    } catch (err) {
      toast.error("Failed to delete analysis.");
      console.error(err);
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="container mx-auto max-w-5xl">
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
              Click any completed analysis to view its activity results
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="border-border text-muted-foreground hover:text-foreground hover:border-primary/40 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="mr-2 w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 w-3.5 h-3.5" />
            )}
            Refresh
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass-surface border-border overflow-hidden">
            {isLoading ? (
              <CardContent className="p-6 space-y-3">
                {["sk-1", "sk-2", "sk-3", "sk-4"].map((k) => (
                  <Skeleton
                    key={k}
                    className="h-12 w-full rounded-lg bg-muted/50"
                  />
                ))}
              </CardContent>
            ) : !analyses || analyses.length === 0 ? (
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto mb-4">
                  <History className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  No analyses yet
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Upload a video above to start analyzing human activities with
                  our deep learning pipeline.
                </p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-8" />
                      <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                        File
                      </TableHead>
                      <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                        Submitted
                      </TableHead>
                      <TableHead className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyses.map((analysis) => (
                      <AnalysisRow
                        key={analysis.id.toString()}
                        analysis={analysis}
                        onDelete={handleDelete}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
