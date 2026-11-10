import { workspaceFingerprint } from "@/lib/wedding";

// FormData includes successful named fields only; UI tabs and filters are not edits.
export function formDraftFingerprint(entries: Iterable<[string, FormDataEntryValue]>): string {
  const fields = [...entries].flatMap(([name, value]) => {
    if (typeof value !== "string") return value.size ? [[name, { name: value.name, size: value.size, lastModified: value.lastModified }]] : [];
    if (name === "supplier_policy") {
      try { return [[name, JSON.parse(value)]]; } catch { /* Keep malformed text visible as an edit. */ }
    }
    return [[name, value]];
  });
  return workspaceFingerprint(fields.sort((a, b) => workspaceFingerprint(a).localeCompare(workspaceFingerprint(b))));
}
