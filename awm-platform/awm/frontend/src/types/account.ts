import type { Currency } from './api';

/** Laravel's default paginator shape (the account endpoints use paginate()->through()). */
export interface LaravelPage<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AccountSummary {
  vehicles: number;
  open_job_cards: number;
  unpaid_invoices: number;
  upcoming_appointments: number;
  active_orders: number;
}

export type OrderFlow = 'vehicle_reservation' | 'spare_part' | 'maintenance_invoice';
export type OrderStatus =
  | 'pending' | 'awaiting_payment' | 'paid' | 'processing' | 'fulfilled'
  | 'cancelled' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentStatus =
  | 'pending' | 'requires_action' | 'awaiting_confirmation' | 'captured'
  | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';

export interface OrderRow {
  number: string;
  flow: OrderFlow;
  status: OrderStatus;
  grand_total: string;
  currency: Currency;
  placed_at: string | null;
}

export interface TrackingStep {
  code: string;
  label: string;
  state: 'done' | 'current' | 'upcoming';
  at: string | null;
}

export interface OrderDetail extends OrderRow {
  paid_at: string | null;
  branch_pickup: string | null;
  items: { name: string; sku: string | null; quantity: number; unit_price: string; line_total: string; image: string | null }[];
  payments: { id: string; method: string | null; status: PaymentStatus; amount: string; created_at: string }[];
  tracking: {
    steps: TrackingStep[];
    estimated_delivery_at: string | null;
    customer_note: string | null;
    pdi: {
      status: { code: 'pending' | 'in_progress' | 'passed' | 'failed'; label: string };
      started: boolean;
      progress: { total: number; done: number; failed: number; percent: number };
      sections: { section: string; items: { label: string; status: 'pending' | 'pass' | 'fail' | 'na' }[] }[];
    } | null;
  } | null;
}

export interface BatterySnapshot {
  certificate_number: string;
  state_of_health_pct: string;
  result: 'pass' | 'attention' | 'fail';
  inspected_at: string;
}

export interface AppointmentRow {
  number: string;
  branch: string;
  service_type: string;
  starts_at: string;
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  vehicle: string | null;
  customer_notes: string | null;
  can_cancel: boolean;
}

export interface OwnedVehicle {
  id: number;
  make: string;
  model: string;
  model_year: number | null;
  vin: string | null;
  plate_number: string | null;
  color: string | null;
  last_mileage_km: number | null;
  purchased_at: string | null;
  warranty_until: string | null;
  under_warranty: boolean;
  image: string | null;
}

export interface OwnedVehicleListItem extends OwnedVehicle {
  latest_battery_report: BatterySnapshot | null;
  next_appointment: AppointmentRow | null;
}

export interface InvoiceRef {
  id: number;
  number: string;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'void';
  total: string;
  balance: string;
  currency: Currency;
}

export interface OwnedVehicleDetail extends OwnedVehicle {
  service_history: {
    number: string;
    service_type: string | null;
    status: { code: string; label: string };
    branch: string | null;
    mileage_in_km: number | null;
    complaint: string | null;
    work_done: string | null;
    opened_at: string;
    completed_at: string | null;
    invoice: InvoiceRef | null;
  }[];
  battery_reports: {
    certificate_number: string;
    inspected_at: string;
    state_of_health_pct: string;
    result: { code: 'pass' | 'attention' | 'fail'; label: string };
    is_valid: boolean;
  }[];
  appointments: AppointmentRow[];
}

export interface InvoiceRow {
  id: number;
  number: string;
  job_card: string | null;
  status: InvoiceRef['status'];
  currency: Currency;
  total: string;
  paid_amount: string;
  balance: string;
  issued_at: string | null;
  due_at: string | null;
  payable: boolean;
}

export interface BatteryReport {
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
  state_of_charge_pct: string | null;
  pack_voltage_v: string | null;
  cell_voltage_v: { min: string | null; max: string | null };
  cell_temp_c: { min: string | null; max: string | null };
  insulation_resistance_mohm: string | null;
  charge_cycles: number | null;
  findings: string | null;
  recommendations: string | null;
  technician: string | null;
}
