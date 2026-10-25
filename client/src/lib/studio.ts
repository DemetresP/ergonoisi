import type { TaskFormat } from "@shared/schema";

export const WORK_TYPES = [
  { value: "shoot", label: "Γύρισμα" },
  { value: "edit", label: "Μοντάζ" },
  { value: "upload", label: "Φόρτωμα" },
] as const;

export type WorkType = (typeof WORK_TYPES)[number]["value"];

export const FORMATS: { value: TaskFormat; label: string }[] = [
  { value: "reel", label: "Reel" },
  { value: "podcast", label: "Podcast" },
];

// Radix Select cannot hold an empty value, so "no series" uses a sentinel
export const NO_SERIES = "__none__";

export const FORMAT_BADGE_CLASSES: Record<TaskFormat, string> = {
  reel: "bg-brand text-brand-foreground border-brand",
  podcast: "bg-primary text-primary-foreground border-primary",
};

const SERIES_COLORS = [
  "bg-sky-600 text-white border-sky-600",
  "bg-amber-500 text-white border-amber-500",
  "bg-rose-600 text-white border-rose-600",
  "bg-violet-600 text-white border-violet-600",
  "bg-slate-500 text-white border-slate-500",
  "bg-orange-600 text-white border-orange-600",
  "bg-indigo-600 text-white border-indigo-600",
  "bg-fuchsia-600 text-white border-fuchsia-600",
  "bg-lime-600 text-white border-lime-600",
];

// Colour follows the series' position in the admin's list so it stays stable across views
export function getSeriesColor(series: string, allSeries: string[]): string {
  const index = allSeries.indexOf(series);
  if (index === -1) return "bg-muted text-muted-foreground border-border";
  return SERIES_COLORS[index % SERIES_COLORS.length];
}
