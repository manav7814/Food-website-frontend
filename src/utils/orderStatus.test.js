import { describe, expect, it } from "vitest";
import { formatOrderStatus, statusProgressIndex } from "./orderStatus";

describe("order status helpers", () => {
  it("formats status labels", () => {
    expect(formatOrderStatus("pending")).toBe("Pending");
    expect(formatOrderStatus("out_for_delivery")).toBe("Out for delivery");
    expect(formatOrderStatus("delivered")).toBe("Completed");
  });

  it("returns progress index", () => {
    expect(statusProgressIndex("pending")).toBe(0);
    expect(statusProgressIndex("assigned")).toBe(1);
    expect(statusProgressIndex("picked")).toBe(2);
    expect(statusProgressIndex("delivered")).toBe(4);
  });
});
