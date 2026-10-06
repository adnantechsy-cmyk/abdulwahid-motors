import { notFound } from 'next/navigation';

/** Catches every URL no page matches, so unknown paths get the localized 404 page (with header and footer). */
export default function CatchAll() {
  notFound();
}
