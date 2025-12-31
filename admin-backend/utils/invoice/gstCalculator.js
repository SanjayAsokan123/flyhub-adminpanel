export function calculateGST(order) {
  const subTotal = order.totalAmount;
  const cgst = +(subTotal * 0.09).toFixed(2);
  const sgst = +(subTotal * 0.09).toFixed(2);

  return {
    subTotal,
    cgst,
    sgst,
    total: subTotal + cgst + sgst,
  };
}
