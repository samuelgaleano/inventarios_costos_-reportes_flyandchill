/**
 * Tipos de la base de datos (espejo del esquema SQL).
 * Mantener en sincronía con supabase/migrations.
 */

export type UserRole = "admin" | "distribuidor";
export type InventoryLocation = "bodega" | "distribuidor";
export type MovementType = "compra" | "transferencia" | "venta" | "ajuste";
export type PaymentMethod =
  | "efectivo"
  | "transferencia"
  | "tarjeta"
  | "nequi"
  | "daviplata"
  | "otro";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "efectivo",
  "transferencia",
  "tarjeta",
  "nequi",
  "daviplata",
  "otro",
];

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  unit_cost: number;
  shipping_cost: number;
  operating_cost: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type PricingSettingsRow = {
  id: number;
  investor_pct: number;
  distributor_pct: number;
  company_pct: number;
  gateway_pct: number;
  discount_pct: number;
  rounding: number;
  updated_at: string;
}

export type DistributorRow = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  active: boolean;
  created_at: string;
}

export type InvestorRow = {
  id: string;
  name: string;
  contact_email: string | null;
  capital_aportado: number;
  participacion_pct: number;
  active: boolean;
  created_at: string;
}

export type ProfileRow = {
  id: string;
  full_name: string;
  role: UserRole;
  distributor_id: string | null;
  active: boolean;
  created_at: string;
}

export type InventoryRow = {
  id: string;
  product_id: string;
  location: InventoryLocation;
  distributor_id: string | null;
  quantity: number;
  updated_at: string;
}

export type SaleRow = {
  id: string;
  product_id: string;
  quantity: number;
  payment_method: PaymentMethod;
  sale_date: string;
  source_location: InventoryLocation;
  source_distributor_id: string | null;
  sold_by: string | null;
  unit_list_price: number;
  unit_price_paid: number;
  discount_pct: number;
  unit_cost_snapshot: number;
  investor_amount: number;
  distributor_amount: number;
  company_amount: number;
  gateway_amount: number;
  total_paid: number;
  note: string | null;
  created_at: string;
}

export type MovementRow = {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  unit_cost: number | null;
  from_location: InventoryLocation | null;
  from_distributor_id: string | null;
  to_location: InventoryLocation | null;
  to_distributor_id: string | null;
  related_sale_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

// ── Vistas ───────────────────────────────────────────────────
export type ProductPricingRow = {
  product_id: string;
  name: string;
  sku: string | null;
  active: boolean;
  unit_cost: number;
  shipping_cost: number;
  operating_cost: number;
  min_cost: number;
  list_price: number;
  price_paid: number;
  discount_amount: number;
  cost: number;
  investor: number;
  distributor: number;
  gateway: number;
  company: number;
}

export type InventorySummaryRow = {
  product_id: string;
  name: string;
  sku: string | null;
  active: boolean;
  bodega: number;
  distribuidor: number;
  total: number;
}

export type SaleDetailRow = SaleRow & {
  product_name: string;
  product_sku: string | null;
  distributor_name: string | null;
}

export type MonthlySummaryRow = {
  month: string;
  num_sales: number;
  units: number;
  revenue: number;
  cost: number;
  investor: number;
  distributor: number;
  company: number;
  gateway: number;
}

export type DistributorSummaryRow = {
  distributor_id: string;
  name: string;
  num_sales: number;
  units: number;
  revenue: number;
  distributor_earnings: number;
}

export type ProductSalesSummaryRow = {
  product_id: string;
  name: string;
  units: number;
  revenue: number;
  cost: number;
  investor: number;
  distributor: number;
  company: number;
}

type InsertOf<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

type Rel = [];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: ProductRow;
        Insert: InsertOf<
          ProductRow,
          | "id"
          | "sku"
          | "shipping_cost"
          | "operating_cost"
          | "active"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<ProductRow>;
        Relationships: Rel;
      };
      pricing_settings: {
        Row: PricingSettingsRow;
        Insert: Partial<PricingSettingsRow>;
        Update: Partial<PricingSettingsRow>;
        Relationships: Rel;
      };
      distributors: {
        Row: DistributorRow;
        Insert: InsertOf<DistributorRow, "id" | "contact_email" | "contact_phone" | "active" | "created_at">;
        Update: Partial<DistributorRow>;
        Relationships: Rel;
      };
      investors: {
        Row: InvestorRow;
        Insert: InsertOf<InvestorRow, "id" | "contact_email" | "capital_aportado" | "participacion_pct" | "active" | "created_at">;
        Update: Partial<InvestorRow>;
        Relationships: Rel;
      };
      profiles: {
        Row: ProfileRow;
        Insert: InsertOf<ProfileRow, "full_name" | "role" | "distributor_id" | "active" | "created_at">;
        Update: Partial<ProfileRow>;
        Relationships: Rel;
      };
      inventory: {
        Row: InventoryRow;
        Insert: InsertOf<InventoryRow, "id" | "distributor_id" | "quantity" | "updated_at">;
        Update: Partial<InventoryRow>;
        Relationships: Rel;
      };
      inventory_movements: {
        Row: MovementRow;
        Insert: InsertOf<MovementRow, "id" | "created_at">;
        Update: Partial<MovementRow>;
        Relationships: Rel;
      };
      sales: {
        Row: SaleRow;
        Insert: InsertOf<SaleRow, "id" | "created_at">;
        Update: Partial<SaleRow>;
        Relationships: Rel;
      };
    };
    Views: {
      product_pricing: { Row: ProductPricingRow; Relationships: Rel };
      inventory_summary: { Row: InventorySummaryRow; Relationships: Rel };
      sales_detail: { Row: SaleDetailRow; Relationships: Rel };
      monthly_summary: { Row: MonthlySummaryRow; Relationships: Rel };
      distributor_summary: { Row: DistributorSummaryRow; Relationships: Rel };
      product_sales_summary: { Row: ProductSalesSummaryRow; Relationships: Rel };
    };
    Functions: {
      register_purchase: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_unit_cost: number;
          p_date: string;
          p_note: string | null;
        };
        Returns: undefined;
      };
      transfer_inventory: {
        Args: {
          p_product_id: string;
          p_distributor_id: string;
          p_quantity: number;
          p_note: string | null;
        };
        Returns: undefined;
      };
      register_sale: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_payment_method: PaymentMethod;
          p_sale_date: string;
          p_source_location: InventoryLocation;
          p_source_distributor_id: string | null;
          p_note: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      inventory_location: InventoryLocation;
      movement_type: MovementType;
      payment_method: PaymentMethod;
    };
  };
}
