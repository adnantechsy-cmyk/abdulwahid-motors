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
