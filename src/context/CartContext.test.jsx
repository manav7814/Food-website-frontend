import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartContext, CartProvider } from "./CartContext";

function TestCart() {
  return (
    <CartContext.Consumer>
      {({ items, addToCart, increaseQuantity, decreaseQuantity }) => (
        <div>
          <button
            onClick={() =>
              addToCart({
                _id: "1",
                name: "Pizza",
                price: 99
              })
            }
          >
            add
          </button>
          <button onClick={() => increaseQuantity("1")}>inc</button>
          <button onClick={() => decreaseQuantity("1")}>dec</button>
          <span data-testid="qty">{items[0]?.quantity || 0}</span>
        </div>
      )}
    </CartContext.Consumer>
  );
}

describe("CartContext", () => {
  it("supports add, increase and decrease quantity", () => {
    render(
      <CartProvider>
        <TestCart />
      </CartProvider>
    );

    fireEvent.click(screen.getByText("add"));
    fireEvent.click(screen.getByText("inc"));
    expect(screen.getByTestId("qty")).toHaveTextContent("2");

    fireEvent.click(screen.getByText("dec"));
    expect(screen.getByTestId("qty")).toHaveTextContent("1");
  });
});
