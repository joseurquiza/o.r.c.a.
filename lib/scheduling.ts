// Pure scheduling helpers — safe to import from server actions, route handlers, or anywhere.
// Kept out of any "use server" file so non-async exports are allowed.

// Compute the next UTC timestamp at which "HH:mm" in `timezone` will occur.
export function computeNextRunAt(runTime: string, timezone: string): Date {
  const [hh, mm] = runTime.split(":").map(Number)
  const now = new Date()

  // Get current time in the target timezone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0)

  const tzYear = get("year")
  const tzMonth = get("month")
  const tzDay = get("day")
  const tzHour = get("hour") === 24 ? 0 : get("hour")
  const tzMinute = get("minute")

  const todayMins = tzHour * 60 + tzMinute
  const targetMins = hh * 60 + mm

  const utcNow = now.getTime()
  const tzWallNowAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute)
  const tzOffsetMs = tzWallNowAsUtc - utcNow

  const dayOffset = todayMins < targetMins ? 0 : 1
  const targetWallUtc = Date.UTC(tzYear, tzMonth - 1, tzDay + dayOffset, hh, mm)
  return new Date(targetWallUtc - tzOffsetMs)
}
