import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthLabel } from "@/lib/labels";
import type { SaleDetailRow } from "@/lib/supabase/types";

export interface ReportTotals {
  revenue: number;
  cost: number;
  investor: number;
  distributor: number;
  company: number;
  gateway: number;
  units: number;
  numSales: number;
}

export interface ReportData {
  periodLabel: string;
  start: string;
  end: string;
  totals: ReportTotals;
  byProduct: { name: string; units: number; revenue: number; company: number }[];
  byDistributor: {
    id: string | null;
    name: string;
    units: number;
    revenue: number;
    earnings: number;
  }[];
  sales: SaleDetailRow[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function monthRange(ref = new Date()) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { start: iso(start), end: iso(end) };
}

function emptyTotals(): ReportTotals {
  return {
    revenue: 0,
    cost: 0,
    investor: 0,
    distributor: 0,
    company: 0,
    gateway: 0,
    units: 0,
    numSales: 0,
  };
}

function aggregate(sales: SaleDetailRow[]): ReportTotals {
  return sales.reduce((a, s) => {
    a.revenue += s.total_paid;
    a.cost += s.unit_cost_snapshot * s.quantity;
    a.investor += s.investor_amount;
    a.distributor += s.distributor_amount;
    a.company += s.company_amount;
    a.gateway += s.gateway_amount;
    a.units += s.quantity;
    a.numSales += 1;
    return a;
  }, emptyTotals());
}

/** Construye el informe del mes indicado (por defecto, el mes actual). */
export async function buildMonthlyReport(ref = new Date()): Promise<ReportData> {
  const { start, end } = monthRange(ref);
  const admin = createAdminClient();
  const { data } = await admin
    .from("sales_detail")
    .select("*")
    .gte("sale_date", start)
    .lt("sale_date", end)
    .order("sale_date", { ascending: true });

  const sales = data ?? [];
  const totals = aggregate(sales);

  // Por producto
  const prodMap = new Map<string, { name: string; units: number; revenue: number; company: number }>();
  for (const s of sales) {
    const cur = prodMap.get(s.product_id) ?? {
      name: s.product_name,
      units: 0,
      revenue: 0,
      company: 0,
    };
    cur.units += s.quantity;
    cur.revenue += s.total_paid;
    cur.company += s.company_amount;
    prodMap.set(s.product_id, cur);
  }

  // Por distribuidor que VENDE (gana la comisión/margen)
  const distMap = new Map<string, { id: string | null; name: string; units: number; revenue: number; earnings: number }>();
  for (const s of sales) {
    const key = s.seller_distributor_id ?? "empresa";
    const cur = distMap.get(key) ?? {
      id: s.seller_distributor_id,
      name: s.seller_name ?? "Venta directa (empresa)",
      units: 0,
      revenue: 0,
      earnings: 0,
    };
    cur.units += s.quantity;
    cur.revenue += s.total_paid;
    cur.earnings += s.distributor_amount;
    distMap.set(key, cur);
  }

  return {
    periodLabel: monthLabel(start),
    start,
    end,
    totals,
    byProduct: [...prodMap.values()].sort((a, b) => b.revenue - a.revenue),
    byDistributor: [...distMap.values()].sort((a, b) => b.revenue - a.revenue),
    sales,
  };
}

/** Filtra el informe a las ventas de un distribuidor (las que él vende). */
export function reportForDistributor(report: ReportData, distributorId: string) {
  const sales = report.sales.filter((s) => s.seller_distributor_id === distributorId);
  return { sales, totals: aggregate(sales) };
}
