export const ORDER_STEPS = [
  "confirmed",
  "driver_assigned",
  "picked_up",
  "out_for_delivery",
  "delivered"
];

export const PRIORITY_LEVELS = ["low", "medium", "high", "urgent"];

export function normalizeOrderStatus(status) {
  if (["pending", "confirmed"].includes(status)) return "confirmed";
  if (["assigned", "accepted", "driver_assigned"].includes(status)) return "driver_assigned";
  if (["picked", "picked_up"].includes(status)) return "picked_up";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "delivered") return "delivered";
  return status;
}

export function formatOrderStatus(status) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === "driver_assigned") return "Driver Assigned";
  if (normalized === "picked_up") return "Picked Up";
  if (normalized === "out_for_delivery") return "Out for delivery";
  if (normalized === "confirmed") return "Order Confirmed";
  if (normalized === "delivered") return "Completed";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatPriority(priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function statusProgressIndex(status) {
  return ORDER_STEPS.indexOf(normalizeOrderStatus(status));
}
