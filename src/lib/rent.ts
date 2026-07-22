import { Prisma } from "@prisma/client";

export type MoneyLike = Prisma.Decimal | number | string;

export function toNumber(value: MoneyLike): number {
  return Number(value);
}

/** Outstanding balance on open/partial charges (amount − amountPaid). */
export function chargeBalance(charge: {
  status: string;
  amount: MoneyLike;
  amountPaid: MoneyLike;
}): number {
  if (charge.status === "VOID" || charge.status === "PAID") return 0;
  return Math.max(0, toNumber(charge.amount) - toNumber(charge.amountPaid));
}

export function sumChargeBalances(
  charges: Array<{ status: string; amount: MoneyLike; amountPaid: MoneyLike }>
): number {
  return charges.reduce((sum, c) => sum + chargeBalance(c), 0);
}

export function deriveChargeStatus(
  amount: number,
  amountPaid: number
): "OPEN" | "PARTIALLY_PAID" | "PAID" {
  if (amountPaid <= 0) return "OPEN";
  if (amountPaid + 0.001 >= amount) return "PAID";
  return "PARTIALLY_PAID";
}
