// src/lib/utils.ts
// General utility helpers.

export function formatDistanceToNow(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 5000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3600_000)}h ago`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "text-red-600 dark:text-red-400";
    case "medium":
      return "text-amber-600 dark:text-amber-400";
    case "low":
      return "text-green-600 dark:text-green-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

export function severityBg(severity: string): string {
  switch (severity) {
    case "high":
      return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
    case "medium":
      return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
    case "low":
      return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "elevated":
      return "bg-amber-500";
    case "alert":
      return "bg-red-500";
    case "offline":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
}

