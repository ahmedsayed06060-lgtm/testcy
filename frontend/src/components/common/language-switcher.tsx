'use client';

import { Languages } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const switchLocale = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    document.cookie = `NEXT_LOCALE=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const segments = pathname.split('/');
    segments[1] = next;
    router.replace(segments.join('/') || `/${next}`);
  };
  return <button type="button" onClick={switchLocale} className="icon-button h-9 gap-2 px-3 text-xs" aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}><Languages className="h-4 w-4" /><span>{locale === 'ar' ? 'EN' : 'العربية'}</span></button>;
}
