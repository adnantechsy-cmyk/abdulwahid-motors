import type { LocalizedText } from '@/store/cartStore';

export type Currency = 'USD' | 'SYP';

export interface CategoryDto {
  id: number;
  slug: string;
  name: string;
  parent_id: number | null;
  image: string | null;
}

export interface VehicleDto {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  model_year: number;
  body_type: string | null;
  powertrain: 'bev' | 'phev' | 'hev' | 'ice';
  specs: Record<string, string | number> | null;
  /** Feature lines by section (chassis, exterior, interior, safety), already in the page language. */
  features?: Record<string, string[]> | null;
  /** null when staff chose to hide it: show "Contact us for price". */
  price: string | null;
  price_visible: boolean;
  brochure_url: string | null;
  deposit_amount: string;
  currency: Currency;
  status: 'available' | 'incoming' | 'reserved' | 'sold';
  branch: string | null;
  category: CategoryDto | null;
  image: string | null;
  gallery: string[];
  name_i18n: LocalizedText;
}

export interface SparePartDto {
  id: number;
  slug: string;
  sku: string;
  name: string;
  description: string | null;
  category: CategoryDto | null;
  price: string | null;
  price_visible: boolean;
  currency: Currency;
  is_oem: boolean;
  compatible_models: string[] | null;
  available_quantity: number;
  image: string | null;
  name_i18n: LocalizedText;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

/** PUT /cart response: the server's authoritative, re-priced cart. */
export interface ServerCart {
  cart_token: string | null;
  currency: Currency;
  items: {
    type: 'spare_part' | 'vehicle' | 'maintenance_invoice';
    id: number;
    flow: 'spare_part' | 'vehicle_reservation' | 'maintenance_invoice';
    quantity: number;
    unit_price: string;
    snapshot: Record<string, unknown> & { name: LocalizedText; sku: string | null; image?: string | null };
  }[];
  dropped: { type: string; id: number; reason: 'not_found' | 'unavailable' | 'currency_mismatch' }[];
}
