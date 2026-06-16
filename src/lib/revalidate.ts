import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Invalidate every cached CRM surface after a write.
 *
 * The clinic dataset is tightly interrelated (a payment shows on billing, the
 * dashboard and the patient view; a session completes an appointment, etc.),
 * so any mutation refreshes all of them. The list pages use full-route ISR
 * (revalidatePath); the dashboard caches its queries under the "dashboard" tag.
 * Call this from API route handlers after a successful create/update/delete.
 */
export function revalidateCrm() {
  revalidatePath("/patients");
  revalidatePath("/appointments");
  revalidatePath("/billing");
  // "max" = purge the tag fully (Next 16's replacement for single-arg revalidateTag).
  revalidateTag("dashboard", "max");
}
