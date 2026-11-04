export const clients = [
  { id: 'acme', name: 'Acme Corporation', initials: 'AC', industry: 'Technology', contact: 'Nadia Sherif', email: 'nadia@acme.example', color: '#5b6cf9', engagements: 3, findings: 28, since: 'Jan 2025' },
  { id: 'northstar', name: 'Northstar Financial', initials: 'NF', industry: 'Financial services', contact: 'Karim Fouad', email: 'karim@northstar.example', color: '#0ea5a4', engagements: 2, findings: 21, since: 'Mar 2025' },
  { id: 'helix', name: 'Helix Health', initials: 'HH', industry: 'Healthcare', contact: 'Sarah Maged', email: 'sarah@helix.example', color: '#ec4899', engagements: 1, findings: 7, since: 'Aug 2026' },
  { id: 'vertex', name: 'Vertex Logistics', initials: 'VL', industry: 'Logistics', contact: 'Hany Samir', email: 'hany@vertex.example', color: '#f59e0b', engagements: 4, findings: 39, since: 'Nov 2024' },
  { id: 'oasis', name: 'Oasis Retail Group', initials: 'OR', industry: 'Retail', contact: 'Dina Ayman', email: 'dina@oasis.example', color: '#8b5cf6', engagements: 2, findings: 15, since: 'Feb 2026' },
  { id: 'atlas', name: 'Atlas Manufacturing', initials: 'AM', industry: 'Manufacturing', contact: 'Tarek Adel', email: 'tarek@atlas.example', color: '#3b82f6', engagements: 3, findings: 44, since: 'Jun 2024' },
];

export const users = [
  { id: 'usr-1', name: 'Omar Khaled', initials: 'OK', email: 'omar@aegis.example', role: 'Administrator', engagements: 8, status: 'active', lastSeen: 'Online now', mfa: true },
  { id: 'usr-2', name: 'Layla Hassan', initials: 'LH', email: 'layla@aegis.example', role: 'Engagement Manager', engagements: 5, status: 'active', lastSeen: '8 min ago', mfa: true },
  { id: 'usr-3', name: 'Youssef Nabil', initials: 'YN', email: 'youssef@aegis.example', role: 'Pentester', engagements: 4, status: 'active', lastSeen: '24 min ago', mfa: true },
  { id: 'usr-4', name: 'Mariam Adel', initials: 'MA', email: 'mariam@aegis.example', role: 'Pentester', engagements: 3, status: 'active', lastSeen: '1 hr ago', mfa: true },
  { id: 'usr-5', name: 'Mostafa Ali', initials: 'MA', email: 'mostafa@aegis.example', role: 'Analyst', engagements: 6, status: 'active', lastSeen: 'Yesterday', mfa: true },
  { id: 'usr-6', name: 'Nadia Sherif', initials: 'NS', email: 'nadia@acme.example', role: 'Client', engagements: 3, status: 'invited', lastSeen: 'Invitation sent', mfa: false },
];

export const auditEvents = [
  { id: 'aud_81c4a92e', time: 'Nov 04, 2026 · 13:02:14 UTC', actor: 'Layla Hassan', action: 'authorization.approved', resource: 'JOB-8F42A', ip: '10.20.4.18', result: 'success', details: 'Target api.acme.example matched verified scope' },
  { id: 'aud_81c49b17', time: 'Nov 04, 2026 · 12:58:42 UTC', actor: 'Omar Khaled', action: 'finding.updated', resource: 'CO-2026-0148', ip: '10.20.4.10', result: 'success', details: 'Status changed from in_progress to open' },
  { id: 'aud_81c47cd2', time: 'Nov 04, 2026 · 12:51:06 UTC', actor: 'Unknown user', action: 'authorization.denied', resource: 'eng-vertex-cloud', ip: '10.20.8.92', result: 'denied', details: 'TARGET_EXCLUDED · administrators alerted' },
  { id: 'aud_81c460fa', time: 'Nov 04, 2026 · 12:42:19 UTC', actor: 'Youssef Nabil', action: 'job.created', resource: 'JOB-8F41D', ip: '10.20.4.22', result: 'success', details: 'Deep Nmap profile · 10.24.8.0/25' },
  { id: 'aud_81c451be', time: 'Nov 04, 2026 · 12:32:55 UTC', actor: 'Mariam Adel', action: 'scope.ownership_verified', resource: 'api.helix.example', ip: '10.20.4.31', result: 'success', details: 'DNS TXT challenge verified' },
  { id: 'aud_81c440a1', time: 'Nov 04, 2026 · 12:18:03 UTC', actor: 'System', action: 'report.generated', resource: 'RPT-2094', ip: 'internal', result: 'success', details: 'Executive summary · English · PDF' },
  { id: 'aud_81c42e19', time: 'Nov 04, 2026 · 11:54:27 UTC', actor: 'Omar Khaled', action: 'auth.refresh_reuse_detected', resource: 'usr-2', ip: '10.20.7.80', result: 'denied', details: 'Token family revoked; user notified' },
];
