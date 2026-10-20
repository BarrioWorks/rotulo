/** Publication routes shared by the keyboard handler and its tests. */
export function publicationShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">): "review" | "history" | null {
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return null;
  switch (event.key.toLowerCase()) {
    case "p": return "review";
    case "h": return "history";
    default: return null;
  }
}
