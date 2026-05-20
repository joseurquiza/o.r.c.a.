"use client"

import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { getSchedule, upsertSchedule, type AgentSchedule } from "@/lib/actions/agent-schedules"

interface Props {
  agentType: string
  agentRef: string
}

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
]

export function ScheduleCard({ agentType, agentRef }: Props) {
  const [schedule, setSchedule] = useState<AgentSchedule | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [runTime, setRunTime] = useState("08:00")
  const [timezone, setTimezone] = useState(
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York",
  )
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSchedule(agentType, agentRef).then((s) => {
      if (s) {
        setSchedule(s)
        setEnabled(s.enabled)
        setRunTime(s.run_time)
        setTimezone(s.timezone)
      }
      setLoaded(true)
    })
  }, [agentType, agentRef])

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertSchedule({ agentType, agentRef, enabled, runTime, timezone })
      if (result.success) {
        toast.success(enabled ? "Schedule saved" : "Schedule disabled")
        const fresh = await getSchedule(agentType, agentRef)
        setSchedule(fresh)
      } else {
        toast.error(result.error || "Failed to save schedule")
      }
    })
  }

  if (!loaded) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule
        </CardTitle>
        <CardDescription>Run this agent automatically every day at a set time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="schedule-enabled" className="font-medium">
              Daily auto-run
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled ? "Runs once a day at your chosen time" : "Only run when triggered manually"}
            </p>
          </div>
          <Switch id="schedule-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="run-time">Run time</Label>
              <Input
                id="run-time"
                type="time"
                value={runTime}
                onChange={(e) => setRunTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {!COMMON_TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {schedule && (
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            {schedule.next_run_at && schedule.enabled && (
              <p>Next run: {new Date(schedule.next_run_at).toLocaleString()}</p>
            )}
            {schedule.last_run_at && (
              <p className="flex items-center gap-1.5">
                {schedule.last_status === "error" ? (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
                Last run: {new Date(schedule.last_run_at).toLocaleString()}
                {schedule.last_status === "error" && schedule.last_error && (
                  <span className="text-destructive"> - {schedule.last_error}</span>
                )}
              </p>
            )}
          </div>
        )}

        <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Saving..." : "Save schedule"}
        </Button>
      </CardContent>
    </Card>
  )
}
