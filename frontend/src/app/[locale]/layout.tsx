import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Providers } from '@/components/common/providers';
import { routing } from '@/i18n/routing';
import '../globals.css';

export const metadata: Metadata = {
  title: { default: 'CyberOps Hub', template: '%s · CyberOps Hub' },
  description: 'Authorization-first security operations, findings, and reporting.',
  icons: { icon: '/favicon.svg' },
  manifest: '/site.webmanifest',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as 'en' | 'ar')) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning><body className="font-sans"><NextIntlClientProvider messages={messages}><Providers>{children}</Providers></NextIntlClientProvider></body></html>;
}
