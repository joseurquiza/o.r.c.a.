import { CheckCircle2, AlertTriangle, XCircle, Info, MinusCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { ReviewCheck } from "@/lib/actions/submissions"

const STATUS_ICON: Record<
  string,
  { icon: typeof CheckCircle2; className: string }
> = {
  passed: { icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  warning: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400" },
  failed: { icon: XCircle, className: "text-red-600 dark:text-red-400" },
  skipped: { icon: MinusCircle, className: "text-muted-foreground" },
  pending: { icon: Clock, className: "text-muted-foreground" },
  running: { icon: Clock, className: "text-muted-foreground" },
}

const SEVERITY_TONE: Record<string, string> = {
  info: "",
  low: "border-blue-300 text-blue-900 dark:text-blue-200 dark:border-blue-800",
  medium: "border-amber-300 text-amber-900 dark:text-amber-200 dark:border-amber-800",
  high: "border-orange-300 text-orange-900 dark:text-orange-200 dark:border-orange-800",
  critical: "border-red-300 text-red-900 dark:text-red-200 dark:border-red-800",
}

export function ChecksList({ checks }: { checks: ReviewCheck[] }) {
  // group by category
  const grouped = checks.reduce<Record<string, ReviewCheck[]>>((acc, c) => {
    acc[c.category] ||= []
    acc[c.category].push(c)
    return acc
  }, {})
  const categories = Object.keys(grouped).sort()

  return (
    <div className="space-y-5">
      {categories.map((cat) => (
        <div key={cat}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {cat}
          </h4>
          <ul className="space-y-2">
            {grouped[cat].map((c) => {
              const { icon: Icon, className } = STATUS_ICON[c.status] ?? { icon: Info, className: "" }
              return (
                <li key={c.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", className)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{c.title}</span>
                        {c.severity !== "info" && (
                          <Badge variant="outline" className={cn("text-xs", SEVERITY_TONE[c.severity])}>
                            {c.severity}
                          </Badge>
                        )}
                        {c.fixed_by_us && (
                          <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/10">
                            fixed by us
                          </Badge>
                        )}
                      </div>
                      {c.detail && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.detail}</p>
                      )}
                      {c.remediation && (
                        <p className="text-xs mt-2 leading-relaxed">
                          <span className="font-medium">Remediation:</span>{" "}
                          <span className="text-muted-foreground">{c.remediation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
