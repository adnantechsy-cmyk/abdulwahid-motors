export type Money = string;
export interface Meta { current_page: number; last_page: number; total: number }

export interface AdminVehicleRow {
  id: number; slug: string; sku: string | null; name: string; model_year: number; vin: string | null;
  powertrain: 'bev' | 'phev' | 'hev' | 'ice'; exterior_color: string | null; specs: Record<string, string | number> | null;
  category: string | null; price: Money; deposit_amount: Money; currency: string;
  status: { code: 'available' | 'incoming' | 'reserved' | 'sold'; label: string };
  is_published: boolean; is_featured: boolean; branch: string | null; image: string | null;
  reserved_order_id: number | null; updated_at: string | null;
}
export interface AdminVehicleList { counts: Record<string, number>; data: AdminVehicleRow[]; meta: Meta }

export interface AdminVehicleFull {
  id: number; slug: string; sku: string | null; vin: string | null; category_id: number | null; model_year: number;
  body_type: string | null; powertrain: string; exterior_color: string | null; specs: Record<string, string | number> | null;
  currency: 'USD' | 'SYP'; branch: string | null; is_published: boolean; is_featured: boolean; sort_order: number;
  reserved_order_id: number | null; name: Record<string, string>; tagline: Record<string, string>;
  description: Record<string, string>; price: Money; deposit_amount: Money; status: string;
  cover_image: { path: string | null; url: string | null }; gallery: { path: string; url: string }[];
  reserved_at: string | null; sold_at: string | null;
}

export interface AdminPartRow {
  id: number; sku: string; oem_number: string | null; name: string; category: string | null; price: Money;
  cost_price: Money | null; currency: string; stock_quantity: number; reserved_quantity: number; available: number;
  is_low_stock: boolean; low_stock_threshold: number; compatible_models: string[]; bin_location: string | null;
  is_published: boolean; image: string | null;
}
export interface AdminPartList {
  counts: { total: number; low_stock: number; out_of_stock: number; hidden: number; stock_value: { currency: string; value: Money }[] };
  data: AdminPartRow[]; meta: Meta;
}
export interface StockMovement {
  id: number; type: string; quantity_change: number; balance_after: number;
  reference: { type: string; number: string | null } | null; user: string | null; note: string | null; at: string;
}
export type AdminPartFull = Omit<AdminPartRow, 'name'> & {
  slug: string; category_id: number | null; is_oem: boolean; hide_when_out_of_stock: boolean;
  name: Record<string, string>; description: Record<string, string>; movements?: StockMovement[];
};

export interface InvoiceRow {
  id: number; number: string; job_card: string | null; customer: { id: number; name: string; phone: string | null } | null;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'void'; is_overdue: boolean; currency: string;
  total: Money; paid_amount: Money; balance: Money; issued_at: string | null; due_at: string | null;
}
export interface InvoiceList {
  outstanding: { currency: string; amount: Money; invoices: number }[];
  collected_today: { currency: string; amount: Money }[];
  data: InvoiceRow[]; meta: Meta;
}
export type InvoiceFull = InvoiceRow & {
  parts_total: Money; labor_total: Money;
  lines: { name: string | null; sku: string | null; quantity: number; unit_price: Money }[] | null;
  payments: { amount: Money; method: string; reference: string | null; received_by: string | null; received_at: string; note: string | null }[];
};

export interface Dashboard {
  sales: { today: { currency: string; flow: string; orders: number; total: Money }[]; month: { currency: string; flow: string; orders: number; total: Money }[] };
  maintenance: { open_by_status: Record<string, number>; completed_today: number; appointments_today: number; appointments_requested: number; pdi_open: number };
  inventory: { low_stock_count: number; low_stock: { id: number; sku: string; name: string; available: number; threshold: number }[] };
  vehicles: Record<string, number>;
  finance: { payments_awaiting_confirmation: number; overdue_invoices: number; outstanding: { currency: string; amount: Money }[] };
}
