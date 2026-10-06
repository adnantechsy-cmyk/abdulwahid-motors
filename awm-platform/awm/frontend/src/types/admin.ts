import type { Currency } from './api';
import type { AppointmentRow, InvoiceRef } from './account';

export interface AdminSummary {
  payments_awaiting?: number;
  job_cards?: Record<'pending' | 'in_progress' | 'waiting_parts' | 'completed', number>;
  appointments_requested?: number;
  appointments_today?: number;
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
