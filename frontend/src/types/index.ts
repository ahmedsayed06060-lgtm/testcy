export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type EngagementStatus = 'active' | 'pending_approval' | 'paused' | 'completed' | 'draft';
export type JobStatus = 'queued' | 'validating' | 'running' | 'completed' | 'failed' | 'cancelled';
export type FindingStatus = 'open' | 'in_progress' | 'retest' | 'fixed' | 'accepted_risk';

export interface Engagement {
  id: string;
  name: string;
  client: string;
  initials: string;
  color: string;
  type: string;
  status: EngagementStatus;
  progress: number;
  findings: Record<Severity, number>;
  scopeCount: number;
  startDate: string;
  endDate: string;
  owner: { name: string; initials: string };
  authorization: 'verified' | 'pending' | 'expired';
  description: string;
}

export interface Finding {
  id: string;
  title: string;
  engagementId: string;
  engagement: string;
  client: string;
  severity: Severity;
  status: FindingStatus;
  asset: string;
  cvss: number;
  cwe: string;
  discovered: string;
  owner: string;
  description: string;
  remediation: string;
  evidence: string;
  tags: string[];
}

export interface Job {
  id: string;
  type: string;
  target: string;
  engagementId: string;
  engagement: string;
  profile: 'light' | 'standard' | 'deep';
  status: JobStatus;
  progress: number;
  started: string;
  duration: string;
  triggeredBy: string;
}

export interface Report {
  id: string;
  name: string;
  client: string;
  type: string;
  language: 'English' | 'Arabic';
  format: 'PDF' | 'DOCX';
  created: string;
  size: string;
  author: string;
}

export interface Activity {
  id: string;
  actor: string;
  initials: string;
  action: string;
  subject: string;
  time: string;
  kind: 'finding' | 'job' | 'report' | 'authorization';
}
