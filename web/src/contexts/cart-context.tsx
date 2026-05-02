"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/types";

const STORAGE_KEY = "bazarplus_cart_v1";

export type CartLine = {
  productId: string;
  quantity: number;
  product: Pick<Product, "id" | "name" | "price" | "imageUrl" | "stock">;
};

function loadStored(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type CartState = {
  lines: CartLine[];
  add: (product: Product, qty?: number) => void;
  setQty: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      } catch {
        /* quota / private mode */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [lines, hydrated]);

  const add = useCallback((product: Product, qty = 1) => {
    setLines((prev) => {
      const next = [...prev];
      const i = next.findIndex((l) => l.productId === product.id);
      const addQty = Math.max(1, Math.min(qty, product.stock));
      if (i === -1) {
        next.push({
          productId: product.id,
          quantity: addQty,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            stock: product.stock,
          },
        });
        return next;
      }
      const line = next[i]!;
      const newQty = Math.min(
        line.quantity + addQty,
        product.stock,
      );
      next[i] = { ...line, quantity: newQty, product: { ...line.product, stock: product.stock } };
      return next;
    });
  }, []);

  const setQty = useCallback((productId: string, quantity: number) => {
    setLines((prev) => {
      const q = Math.max(0, Math.floor(quantity));
      if (q === 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) =>
        l.productId === productId
          ? {
              ...l,
              quantity: Math.min(q, l.product.stock),
            }
          : l,
      );
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const itemCount = useMemo(
    () => lines.reduce((s, l) => s + l.quantity, 0),
    [lines],
  );

  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const p = parseFloat(l.product.price);
      return sum + (Number.isFinite(p) ? p * l.quantity : 0);
    }, 0);
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      add,
      setQty,
      remove,
      clear,
      itemCount,
      subtotal,
    }),
    [lines, add, setQty, remove, clear, itemCount, subtotal],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
