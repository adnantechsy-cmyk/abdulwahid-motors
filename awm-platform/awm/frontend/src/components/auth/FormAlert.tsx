import type { SubmitResult } from '@/lib/auth-client';

/** Form-level failure that isn't tied to one field (rate limit, server down). */
export function FormAlert({ result, messages }: { result: Extract<SubmitResult, { ok: false }> | null; messages: Record<'throttled' | 'unavailable' | 'unknown', string> }) {
  if (!result || result.kind === 'validation') return null;

  return (
    <p role="alert" className="border-s-4 border-awm-red bg-awm-panel p-4 text-sm font-medium">
      {messages[result.kind]}
    </p>
  );
}
