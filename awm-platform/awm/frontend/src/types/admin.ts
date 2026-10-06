import type { Currency } from './api';
import type { AppointmentRow, InvoiceRef } from './account';

export interface AdminSummary {
  payments_awaiting?: number;
  job_cards?: Record<'pending' | 'in_progress' | 'waiting_parts' | 'completed', number>;
  appointments_requested?: number;
  appointments_today?: number;
  orders_unpaid?: number;
  orders_to_fulfil?: number;
  parts_low_stock?: number;
  pdi_open?: number;
  pdi_handover?: number;
}

export type PaymentTab = 'awaiting_confirmation' | 'captured' | 'failed';

export interface AdminPayment {
  id: string;
  status: string;
  amount: string;
  currency: Currency;
  reference: string | null;
  method: string | null;
  method_code: string | null;
  has_proof: boolean;
  failure_message: string | null;
  created_at: string;
  confirmed_at: string | null;
  order: {
    number: string;
    flow: string;
    status: string;
    grand_total: string;
    branch_pickup: string | null;
    customer: { name: string | null; phone: string | null; email: string | null };
  } | null;
}

export type JobCardAction = 'start' | 'wait_parts' | 'resume' | 'complete';
export type JobCardStatusCode = 'pending' | 'in_progress' | 'waiting_parts' | 'completed';

export interface AdminJobCard {
  id: number;
  number: string;
  status: { code: JobCardStatusCode; label: string };
  actions: JobCardAction[];
  service_type: string | null;
  branch: string | null;
  complaint: string | null;
  work_done: string | null;
  mileage_in_km: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  customer: { id: number; name: string; phone: string | null } | null;
  vehicle: { label: string; plate_number: string | null; vin: string | null } | null;
  technician: { id: number; name: string } | null;
  invoice: Pick<InvoiceRef, 'number' | 'status' | 'total' | 'currency'> | null;
}

export interface Technician {
  id: number;
  name: string;
}

export interface AdminAppointment extends AppointmentRow {
  id: number;
  contact_name: string | null;
  contact_phone: string | null;
  user_id: number | null;
  customer_vehicle_id: number | null;
  staff_notes: string | null;
  handled_by: string | null;
  job_card_id: number | null;
}

export type OrderTab = 'unpaid' | 'paid' | 'processing' | 'fulfilled' | 'closed';

export interface AdminOrder {
  number: string;
  flow: string;
  status: string;
  currency: Currency;
  grand_total: string;
  items_count: number;
  branch_pickup: string | null;
  placed_at: string | null;
  paid_at: string | null;
  customer: { name: string | null; phone: string | null; email: string | null };
}

export interface AdminOrderDetail extends AdminOrder {
  items: { id: number; name: string; sku: string | null; quantity: number; unit_price: string; line_total: string }[];
  payments: {
    id: string;
    status: string;
    amount: string;
    method: string | null;
    method_code: string | null;
    manual: boolean;
    note: string | null;
    has_proof: boolean;
    failure_message: string | null;
    created_at: string;
    confirmed_at: string | null;
  }[];
  shipping_address: Record<string, string> | null;
  pdi: { id: number; status: string } | null;
  actions: { record_payment: boolean; advance: ('processing' | 'fulfilled')[]; cancel: boolean };
}

export interface AdminPart {
  id: number;
  sku: string;
  oem_number: string | null;
  name: { ar?: string; en?: string };
  display_name: string;
  category: { id: number; name: string } | null;
  price: string;
  show_price: boolean;
  currency: Currency;
  is_oem: boolean;
  is_published: boolean;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
}

export interface AdminPartDetail extends AdminPart {
  description: { ar?: string; en?: string };
  cost_price: string | null;
  cover_url: string | null;
  compatible_models: string[];
  bin_location: string | null;
  hide_when_out_of_stock: boolean;
}

export interface StockMovementRow {
  id: number;
  type: string;
  change: number;
  balance: number;
  note: string | null;
  by: string | null;
  reference: string | null;
  created_at: string;
}

export interface PartCategory {
  id: number;
  name: string;
}

export interface AdminVehicleRow {
  id: number;
  sku: string | null;
  slug: string;
  name: { ar?: string; en?: string };
  display_name: string;
  model_year: number;
  powertrain: 'bev' | 'phev' | 'hev' | 'ice';
  price: string;
  show_price: boolean;
  currency: Currency;
  status: 'available' | 'incoming' | 'reserved' | 'sold';
  branch: string | null;
  is_published: boolean;
  has_brochure: boolean;
  has_cover: boolean;
  category_id: number | null;
}

export interface AdminVehicleDetail extends AdminVehicleRow {
  tagline: { ar?: string; en?: string };
  description: { ar?: string; en?: string };
  vin: string | null;
  body_type: string | null;
  exterior_color: string | null;
  deposit_amount: string;
  is_featured: boolean;
  sort_order: number;
  cover_url: string | null;
  brochure_url: string | null;
  specs: Record<string, string | number>;
  features: Record<string, { ar?: string[]; en?: string[] }>;
  gallery: { path: string; url: string }[];
}

export interface AdminCategory {
  id: number;
  type: 'vehicle' | 'spare_part';
  parent_id: number | null;
  slug: string;
  name: { ar?: string; en?: string };
  sort_order: number;
  is_active: boolean;
  items_count: number;
}
export type PdiStage = 'pending' | 'in_progress' | 'failed' | 'handover' | 'delivered';

export interface AdminPdi {
  id: number;
  order_number: string | null;
  has_account: boolean;
  customer: { name?: string | null; phone?: string | null; email?: string | null } | null;
  vehicle: { id: number | null; name: string | null; vin: string | null };
  status: 'pending' | 'in_progress' | 'passed' | 'failed';
  technician: string | null;
  progress: { total: number; done: number; failed: number; percent: number };
  estimated_delivery_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  delivered: boolean;
}

export type PdiItemStatus = 'pending' | 'pass' | 'fail' | 'na';

export interface AdminPdiDetail extends AdminPdi {
  notes: string | null;
  customer_note: { ar?: string; en?: string } | [];
  items: {
    id: number;
    section: string;
    code: string;
    label: { ar?: string; en?: string };
    status: PdiItemStatus;
    note: string | null;
    checked_by: string | null;
    checked_at: string | null;
  }[];
}

export interface AdminBatteryReport {
  id: number;
  certificate_number: string;
  verification_code: string;
  verify_url: string;
  is_valid: boolean;
  is_revoked: boolean;
  inspected_at: string;
  valid_until: string | null;
  vehicle: { make: string; model: string; model_year: number | null; vin: string | null };
  mileage_km: number | null;
  result: { code: 'pass' | 'attention' | 'fail'; label: string };
  state_of_health_pct: string;
  technician: string | null;
  owner: { id: number; name: string; phone: string | null } | null;
}

export interface AdminCustomerVehicle {
  id: number;
  make: string;
  model: string;
  model_year: number | null;
  vin: string | null;
  plate_number: string | null;
  last_mileage_km: number | null;
  owner: { id: number; name: string; phone: string | null } | null;
}