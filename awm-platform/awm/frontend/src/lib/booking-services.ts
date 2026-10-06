/** Service types Laravel accepts for appointments (AppointmentController::store). Shared by the booking form and the Services page. */
export const SERVICE_TYPES = ['maintenance', 'repair', 'diagnostics', 'warranty', 'inspection', 'battery_check'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];
