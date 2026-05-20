import { cn } from "@/lib/utils"

export function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 85
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
      : score >= 60
        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
        : "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        tone,
      )}
      title="Production-readiness score"
    >
      {score}/100
    </span>
  )
}
