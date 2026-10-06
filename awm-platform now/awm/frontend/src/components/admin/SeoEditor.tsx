'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button, Field, Input, Textarea, cx } from '@/components/ui/primitives';
import { ApiError, apiFetch } from '@/lib/api/client';

type L = { ar?: string; en?: string };
export interface SeoTarget {
  type: string;
  key: string;
  meta: {
    meta_title: L; meta_description: L; keywords: L; og_title: L; og_description: L;
    og_image: string | null; canonical_url: string | null; robots: string;
    in_sitemap: boolean; sitemap_priority: number | null; sitemap_changefreq: string | null;
  };
  preview: Record<string, { title: string; description: string | null; canonical: string; open_graph: { image: string | null; title: string; description: string | null } }>;
}

const TITLE = [30, 60] as const;
const DESC = [70, 160] as const;

/** Meta editor with live Google + share previews and the validation checklist from the design. */
export function SeoEditor({ target, label }: { target: SeoTarget; label: string }) {
  const t = useTranslations('admin.seo');
  const uiLocale = useLocale();
  const router = useRouter();
  const [lang, setLang] = useState<'ar' | 'en'>(uiLocale === 'en' ? 'en' : 'ar');
  const [m, setM] = useState(target.meta);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (field: 'meta_title' | 'meta_description' | 'keywords' | 'og_title' | 'og_description', value: string) =>
    setM((s) => ({ ...s, [field]: { ...s[field], [lang]: value } }));

  const pv = target.preview[lang];
  // What Google will show: the override if typed, else the generated default.
  const title = m.meta_title[lang]?.trim() || pv.title;
  const description = m.meta_description[lang]?.trim() || pv.description || '';
  const url = m.canonical_url || pv.canonical;
  const image = m.og_image || pv.open_graph.image;
  const [index, follow] = [!m.robots.startsWith('noindex'), !m.robots.endsWith('nofollow')];

  const checks = useMemo(() => [
    { ok: title.length >= TITLE[0] && title.length <= TITLE[1], text: t('check.title', { min: TITLE[0], max: TITLE[1] }), value: title.length },
    { ok: description.length >= DESC[0] && description.length <= DESC[1], text: t('check.description', { min: DESC[0], max: DESC[1] }), value: description.length },
    { ok: !!url && url.startsWith('https://'), text: t('check.canonical'), value: url ? 'https' : '-' },
    { ok: !!image, text: t('check.image'), value: image ? '✓' : '-' },
    { ok: index, text: t('check.indexable'), value: index ? 'index' : 'noindex' },
  ], [title, description, url, image, index, t]);

  async function save() {
    setSaving(true);
    setStatus(null);
    const path = target.type === 'route' ? `/admin/seo/routes/${target.key}` : `/admin/seo/${target.type}/${target.key}`;
    try {
      await apiFetch(path, { method: 'PUT', locale: uiLocale, body: JSON.stringify({ ...m, sitemap_priority: m.sitemap_priority ?? undefined, sitemap_changefreq: m.sitemap_changefreq ?? undefined }) });
      setStatus({ ok: true, text: t('saved') });
      router.refresh();
    } catch (e) {
      setStatus({ ok: false, text: e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : t('error') });
    } finally {
      setSaving(false);
    }
  }

  const counter = (n: number, [min, max]: readonly [number, number]) => (
    <span className={cx('font-mono', n === 0 ? 'text-awm-muted' : n < min || n > max ? 'text-awm-red' : 'text-awm-ok')}>{n} / {max}</span>
  );

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="flex flex-col gap-5 border border-awm-line p-5" aria-labelledby="seo-editor">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="seo-editor" className="marker-square text-lg font-extrabold">{label}</h2>
          <div className="flex border border-awm-black" role="group" aria-label={t('language')}>
            {(['ar', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
                className={cx('px-3 py-1.5 font-mono text-xs font-bold', lang === l ? 'bg-awm-black text-white' : 'bg-white')}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <Field label={t('field.title')} hint={counter(m.meta_title[lang]?.length ?? 0, TITLE)}>
          <Input dir={lang === 'ar' ? 'rtl' : 'ltr'} value={m.meta_title[lang] ?? ''} placeholder={pv.title} onChange={(e) => set('meta_title', e.target.value)} />
        </Field>
        <Field label={t('field.description')} hint={counter(m.meta_description[lang]?.length ?? 0, DESC)}>
          <Textarea dir={lang === 'ar' ? 'rtl' : 'ltr'} rows={3} value={m.meta_description[lang] ?? ''} placeholder={pv.description ?? ''} onChange={(e) => set('meta_description', e.target.value)} />
        </Field>
        <Field label={t('field.keywords')} hint={t('field.keywordsHint')}>
          <Input dir={lang === 'ar' ? 'rtl' : 'ltr'} value={m.keywords[lang] ?? ''} onChange={(e) => set('keywords', e.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('field.ogTitle')}><Input dir={lang === 'ar' ? 'rtl' : 'ltr'} value={m.og_title[lang] ?? ''} placeholder={title} onChange={(e) => set('og_title', e.target.value)} /></Field>
          <Field label={t('field.ogImage')}><Input dir="ltr" className="font-mono" value={m.og_image ?? ''} placeholder="https://…/share.jpg" onChange={(e) => setM((s) => ({ ...s, og_image: e.target.value || null }))} /></Field>
        </div>
        <Field label={t('field.canonical')} hint={t('field.canonicalHint')}>
          <Input dir="ltr" className="font-mono" value={m.canonical_url ?? ''} placeholder={pv.canonical} onChange={(e) => setM((s) => ({ ...s, canonical_url: e.target.value || null }))} />
        </Field>

        <fieldset className="flex flex-wrap gap-6 border-t border-awm-line pt-4">
          <legend className="mb-2 text-xs font-bold text-awm-muted">{t('field.robots')}</legend>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={index} className="size-5 accent-awm-red"
            onChange={(e) => setM((s) => ({ ...s, robots: `${e.target.checked ? 'index' : 'noindex'},${follow ? 'follow' : 'nofollow'}` }))} />{t('field.index')}</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={follow} className="size-5 accent-awm-red"
            onChange={(e) => setM((s) => ({ ...s, robots: `${index ? 'index' : 'noindex'},${e.target.checked ? 'follow' : 'nofollow'}` }))} />{t('field.follow')}</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={m.in_sitemap} className="size-5 accent-awm-red"
            onChange={(e) => setM((s) => ({ ...s, in_sitemap: e.target.checked }))} />{t('field.inSitemap')}</label>
        </fieldset>

        {status && <p role={status.ok ? 'status' : 'alert'} className={cx('text-sm font-medium', status.ok ? 'text-awm-ok' : 'text-awm-red')}>{status.text}</p>}
        <div className="flex flex-wrap gap-2 border-t border-awm-line pt-4">
          <Button onClick={save} disabled={saving} icon="check">{saving ? t('saving') : t('save')}</Button>
          <Button variant="ghost" onClick={() => { setM(target.meta); setStatus(null); }}>{t('reset')}</Button>
          <a href={pv.canonical} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">
            {t('viewPage')}<Icon name="external" size={14} />
          </a>
        </div>
      </section>

      <div className="flex flex-col gap-5">
        <section className="border border-awm-line" aria-labelledby="serp">
          <h3 id="serp" className="border-b border-awm-line bg-awm-surface px-4 py-2 text-xs font-bold">{t('googlePreview')}</h3>
          <div className="flex flex-col gap-1 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
            <p className="truncate font-mono text-xs text-awm-muted" dir="ltr">{url.replace(/^https?:\/\//, '')}</p>
            <p className="line-clamp-2 text-lg leading-snug text-[#1a0dab]">{title}</p>
            <p className="line-clamp-2 text-sm leading-6 text-awm-muted">{description || t('noDescription')}</p>
          </div>
        </section>

        <section className="border border-awm-line" aria-labelledby="og">
          <h3 id="og" className="border-b border-awm-line bg-awm-surface px-4 py-2 text-xs font-bold">{t('sharePreview')}</h3>
          <div className="aspect-[1200/630] bg-awm-surface">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered URL */}
            {image ? <img src={image} alt="" className="size-full object-cover" /> : <p className="flex size-full items-center justify-center text-sm text-awm-muted">{t('noImage')}</p>}
          </div>
          <div className="flex flex-col gap-1 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <p className="font-extrabold">{m.og_title[lang] || title}</p>
            <p className="line-clamp-2 text-sm text-awm-muted">{m.og_description[lang] || description}</p>
          </div>
        </section>

        <section className="border border-awm-line" aria-labelledby="audit">
          <h3 id="audit" className="border-b border-awm-line bg-awm-surface px-4 py-2 text-xs font-bold">{t('checklist', { passed: checks.filter((c) => c.ok).length, total: checks.length })}</h3>
          <ul className="divide-y divide-awm-line text-sm">
            {checks.map((c) => (
              <li key={c.text} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="flex items-center gap-2"><Icon name={c.ok ? 'check' : 'alert'} size={16} className={c.ok ? 'text-awm-ok' : 'text-awm-red'} />{c.text}</span>
                <span className="font-mono text-xs">{c.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
