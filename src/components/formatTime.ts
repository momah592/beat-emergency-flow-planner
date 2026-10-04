/** Readable Irish-locale timestamp, or an explicit absence. Never invents a time. */
export function formatTimestamp(iso: string | undefined): string {
  if (!iso) return "Not supplied";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not supplied";
  return date.toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });
}
