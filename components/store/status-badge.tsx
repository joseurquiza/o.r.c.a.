import { Badge } from "@/components/ui/badge"

const STATUS_VARIANTS: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-muted text-foreground" },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200" },
  in_review: { label: "In review", className: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" },
  changes_requested: {
    label: "Changes requested",
    className: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
}

export function StatusBadge({ status }: { status: string }) {
  const v = STATUS_VARIANTS[status] ?? { label: status, className: "" }
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  )
}
