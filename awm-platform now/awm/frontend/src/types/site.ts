export interface SiteSettings {
  name: string;
  values: Record<string, string | number | boolean | null>;
  branches: { code: string; name: string; street: string; city: string }[];
}
