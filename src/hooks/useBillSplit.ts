import { useState, useMemo, useCallback } from "react";

/* ─── Types ─── */

export type SplitMode = "equal" | "byItem";

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Bill {
  items: BillItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface ItemSelection {
  selected: boolean;
  selectedQuantity: number;
}

export interface EqualSplitResult {
  /** Amount each person pays (before tax) */
  sharePerPerson: number;
  /** Tax each person pays */
  taxPerPerson: number;
  /** Total each person pays (share + tax) */
  totalPerPerson: number;
  /** Remainder applied to the last person's tax */
  lastPersonTaxAdjustment: number;
}

export interface UseBillSplitReturn {
  mode: SplitMode;
  /** Switch between equal and byItem modes */
  setMode: (mode: SplitMode) => void;

  // ── Equal mode ──
  numPeople: number;
  /** Set number of people (min 1) */
  setNumPeople: (n: number) => void;
  /** Per-person share of the subtotal */
  equalShare: number;
  /** Per-person share of the tax */
  equalTaxShare: number;
  /** Per-person total (share + tax) */
  equalTotal: number;
  /** Extra cents the last person pays to cover rounding */
  lastPersonTaxAdjustment: number;

  // ── By Item mode ──
  itemSelections: Map<string, ItemSelection>;
  /** Toggle an item on/off. Resets quantity to 1 on deselect. */
  toggleItem: (itemId: string) => void;
  /** Set the quantity for a selected item (clamped 1..item.quantity) */
  setItemQuantity: (itemId: string, qty: number) => void;
  /** Running subtotal for selected items */
  mySubtotal: number;
  /** Proportional tax share based on mySubtotal */
  myTaxShare: number;
  /** Total the user owes (mySubtotal + myTaxShare) */
  myTotal: number;

  // ── Shared ──
  /** Whether the user can proceed to payment */
  canPay: boolean;
  /** Warning if selections exceed the bill total */
  overSelectionWarning: boolean;
}

/**
 * Round a number to 2 decimal places using banker's rounding.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Hook encapsulating all bill-splitting logic for equal and by-item modes.
 *
 * @param bill - The full bill object with items, subtotal, tax, and total.
 * @returns Controls and computed values for both split modes.
 *
 * @example
 * ```tsx
 * const { mode, setMode, equalTotal, toggleItem, myTotal, canPay } = useBillSplit(bill);
 * ```
 */
export function useBillSplit(bill: Bill): UseBillSplitReturn {
  const [mode, setMode] = useState<SplitMode>("equal");
  const [numPeople, setNumPeopleRaw] = useState(2);
  const [itemSelections, setItemSelections] = useState<Map<string, ItemSelection>>(new Map());

  /**
   * Set number of people, enforcing a minimum of 1.
   */
  const setNumPeople = useCallback((n: number) => {
    setNumPeopleRaw(Math.max(1, n));
  }, []);

  /* ─── Equal mode calculations ─── */

  const equalResult = useMemo((): EqualSplitResult => {
    const sharePerPerson = round2(bill.subtotal / numPeople);
    const baseTax = round2(bill.taxAmount / numPeople);

    // Calculate rounding remainder for tax
    const taxUsed = round2(baseTax * (numPeople - 1));
    const lastPersonTax = round2(bill.taxAmount - taxUsed);
    const lastPersonTaxAdjustment = round2(lastPersonTax - baseTax);

    return {
      sharePerPerson,
      taxPerPerson: baseTax,
      totalPerPerson: round2(sharePerPerson + baseTax),
      lastPersonTaxAdjustment,
    };
  }, [bill.subtotal, bill.taxAmount, numPeople]);

  /* ─── By Item mode actions ─── */

  /**
   * Toggle an item's selection state.
   * When deselecting, resets selectedQuantity to 1.
   */
  const toggleItem = useCallback(
    (itemId: string) => {
      setItemSelections((prev) => {
        const next = new Map(prev);
        const existing = next.get(itemId);
        if (existing?.selected) {
          // Deselect → reset quantity
          next.set(itemId, { selected: false, selectedQuantity: 1 });
        } else {
          next.set(itemId, { selected: true, selectedQuantity: 1 });
        }
        return next;
      });
    },
    [],
  );

  /**
   * Set the quantity for a selected item.
   * Clamps between 1 and the item's total quantity on the bill.
   */
  const setItemQuantity = useCallback(
    (itemId: string, qty: number) => {
      const item = bill.items.find((i) => i.id === itemId);
      if (!item) return;

      const clamped = Math.min(Math.max(1, qty), item.quantity);
      setItemSelections((prev) => {
        const next = new Map(prev);
        next.set(itemId, { selected: true, selectedQuantity: clamped });
        return next;
      });
    },
    [bill.items],
  );

  /* ─── By Item mode calculations ─── */

  const byItemResult = useMemo(() => {
    let mySubtotal = 0;

    for (const item of bill.items) {
      const sel = itemSelections.get(item.id);
      if (sel?.selected) {
        mySubtotal += sel.selectedQuantity * item.unitPrice;
      }
    }

    mySubtotal = round2(mySubtotal);

    // Tax is proportional to the user's share of the subtotal
    const myTaxShare =
      bill.subtotal > 0 ? round2((mySubtotal / bill.subtotal) * bill.taxAmount) : 0;
    const myTotal = round2(mySubtotal + myTaxShare);

    // Warn if total selections across all selected items exceed the bill
    const overSelectionWarning = myTotal > bill.total;

    return { mySubtotal, myTaxShare, myTotal, overSelectionWarning };
  }, [bill, itemSelections]);

  /* ─── canPay ─── */

  const canPay = useMemo(() => {
    if (mode === "equal") {
      return numPeople >= 1;
    }
    // byItem: at least one item must be selected
    return byItemResult.mySubtotal > 0;
  }, [mode, numPeople, byItemResult.mySubtotal]);

  return {
    mode,
    setMode,

    numPeople,
    setNumPeople,
    equalShare: equalResult.sharePerPerson,
    equalTaxShare: equalResult.taxPerPerson,
    equalTotal: equalResult.totalPerPerson,
    lastPersonTaxAdjustment: equalResult.lastPersonTaxAdjustment,

    itemSelections,
    toggleItem,
    setItemQuantity,
    mySubtotal: byItemResult.mySubtotal,
    myTaxShare: byItemResult.myTaxShare,
    myTotal: byItemResult.myTotal,

    canPay,
    overSelectionWarning: byItemResult.overSelectionWarning,
  };
}
