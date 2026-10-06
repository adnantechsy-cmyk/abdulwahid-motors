import { getTranslations } from 'next-intl/server';
import { MAX_QUERY } from '@/lib/search';

/**
 * Plain GET form: works without JavaScript and every search is a shareable URL.
 * No action is set, so it submits to the page it is on; the search page itself is /search.
 */
export async function SearchForm({ query = '', id = 'q' }: { query?: string; id?: string }) {
  const t = await getTranslations('search');

  return (
    <form method="get" role="search" className="flex flex-col gap-2 sm:flex-row">
      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor={id} className="text-sm font-bold">{t('label')}</label>
        <input
          id={id}
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t('placeholder')}
          maxLength={MAX_QUERY}
          minLength={2}
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full border border-awm-line bg-white px-4 text-base placeholder:text-awm-muted/60 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-awm-red"
        />
      </div>
      <button type="submit" className="h-12 bg-awm-red px-8 text-sm font-bold text-white hover:bg-awm-black sm:mt-7">{t('submit')}</button>
    </form>
  );
}
