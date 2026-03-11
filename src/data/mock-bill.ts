export const BILL_ITEMS = [
  { id: 1, name: "Truffle Risotto", qty: 1, price: 28.0 },
  { id: 2, name: "Grilled Salmon", qty: 1, price: 34.0 },
  { id: 3, name: "Caesar Salad", qty: 2, price: 14.0 },
  { id: 4, name: "Sparkling Water", qty: 3, price: 6.5 },
  { id: 5, name: "Tiramisu", qty: 2, price: 12.0 },
  { id: 6, name: "Espresso", qty: 2, price: 4.5 },
];

export const TAX_RATE = 0.1;

export const getSubtotal = (items: typeof BILL_ITEMS) =>
  items.reduce((sum, item) => sum + item.qty * item.price, 0);

export const getTotal = (items: typeof BILL_ITEMS) => {
  const sub = getSubtotal(items);
  return sub + sub * TAX_RATE;
};
