'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRight, Building2, Mail, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Field, Input } from '@/components/ui/input';
import { PageHeader } from './page-header';
import { clients as initialClients } from '@/lib/org-data';
import { useToast } from '@/components/ui/toast';

export function ClientsView() {
  const locale = useLocale();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const filtered = clients.filter((client) => `${client.name} ${client.industry}`.toLowerCase().includes(search.toLowerCase()));
  const addClient = () => { if (name.trim().length < 2 || !email.includes('@')) return; setClients((current) => [...current, { id: crypto.randomUUID(), name, initials: name.split(' ').map((word) => word[0]).join('').slice(0, 2), industry: 'Technology', contact: name, email, color: '#0ea5a4', engagements: 0, findings: 0, since: 'Nov 2026' }]); setOpen(false); setName(''); setEmail(''); toast('Client created', 'You can now assign engagements and portal users.'); };
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow="Organization" title="Clients" description="Manage client organizations, contacts, engagements, and portal access." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add client</Button>} /><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative max-w-md flex-1"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client organizations…" className="h-10 w-full rounded-lg border border-line bg-surface ps-9 pe-3 text-xs outline-none focus:border-brand-500" /></div><Badge variant="success">{clients.length} organizations</Badge></div><div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map((client) => <Link href={`/${locale}/clients/${client.id}`} key={client.id} className="card group p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"><div className="flex items-start gap-3"><Avatar name={client.name} initials={client.initials} color={client.color} size="lg" className="rounded-xl" /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold group-hover:text-brand-700">{client.name}</h2><p className="mt-1 text-[11px] text-muted">{client.industry} · Client since {client.since}</p></div><ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-1" /></div><div className="mt-5 grid grid-cols-2 divide-x divide-line rounded-lg bg-canvas/60 py-3"><div className="px-3"><p className="text-lg font-semibold">{client.engagements}</p><p className="text-[10px] text-muted">Engagements</p></div><div className="px-3"><p className="text-lg font-semibold">{client.findings}</p><p className="text-[10px] text-muted">Open findings</p></div></div><div className="mt-4 border-t border-line pt-4 text-[11px] text-muted"><p className="font-medium text-ink">{client.contact}</p><p className="mt-1 flex items-center gap-1.5"><Mail className="h-3 w-3" />{client.email}</p></div></Link>)}</div><Modal open={open} onClose={() => setOpen(false)} title="Add client organization" description="Create a tenant boundary for engagements, users, and reports." size="sm"><div className="space-y-5 p-6"><Field label="Company name" required><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Client organization" /></Field><Field label="Primary contact email" required><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="security@client.example" /></Field></div><div className="flex justify-end gap-3 border-t border-line px-6 py-4"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={addClient} disabled={name.trim().length < 2 || !email.includes('@')}><Building2 className="h-4 w-4" />Create client</Button></div></Modal></div>;
}
