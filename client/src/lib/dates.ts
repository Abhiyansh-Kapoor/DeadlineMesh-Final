const dayMs = 86_400_000;

export function todayLocal() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function dayNumber(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / dayMs;
}

export function addDays(value: string, days: number) {
  return new Date((dayNumber(value) + days) * dayMs).toISOString().slice(0, 10);
}

export function formatDay(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value.slice(0, 10) + "T12:00:00Z");
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
