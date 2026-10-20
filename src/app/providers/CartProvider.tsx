import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";

export interface CartItem {
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  unitPriceXaf: number; // affichage uniquement — le serveur recalcule à la commande
  quantity: number;
  image: string | null;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotalXaf: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "arkane_cart_v1";

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* stockage indisponible : le panier reste en mémoire */
    }
  }, [items]);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { ...item, quantity }];
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.variantId !== variantId)
        : prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotalXaf = items.reduce((s, i) => s + i.unitPriceXaf * i.quantity, 0);
    return {
      items,
      count,
      subtotalXaf,
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [items, isOpen, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider");
  return ctx;
}
