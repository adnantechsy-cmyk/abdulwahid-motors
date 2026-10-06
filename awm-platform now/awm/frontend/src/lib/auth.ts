/** httpOnly cookie holding the Sanctum token. Shared by middleware and route handlers. */
export const AUTH_COOKIE = 'awm_token';

/**
 * Non-secret hint ("customer" | "staff") readable by client components, so public pages can
 * show the right account link without reading cookies on the server (which would make every
 * page dynamic and uncacheable). Never used for authorisation.
 */
export const ROLE_HINT_COOKIE = 'awm_role';
