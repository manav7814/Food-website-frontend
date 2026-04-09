const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

export function formatINR(value) {
  return inrFormatter.format(Number(value) || 0);
}
