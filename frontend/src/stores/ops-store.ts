import { create } from 'zustand';
import { engagements, findings, jobs, reports } from '@/lib/demo-data';
import type { Engagement, Finding, Job, Report } from '@/types';

interface OpsState {
  engagements: Engagement[];
  findings: Finding[];
  jobs: Job[];
  reports: Report[];
  addEngagement: (engagement: Engagement) => void;
  addFinding: (finding: Finding) => void;
  addJob: (job: Job) => void;
  cancelJob: (id: string) => void;
  setFindingStatus: (id: string, status: Finding['status']) => void;
  addReport: (report: Report) => void;
}

export const useOpsStore = create<OpsState>((set) => ({
  engagements,
  findings,
  jobs,
  reports,
  addEngagement: (engagement) => set((state) => ({ engagements: [engagement, ...state.engagements] })),
  addFinding: (finding) => set((state) => ({ findings: [finding, ...state.findings] })),
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  cancelJob: (id) => set((state) => ({ jobs: state.jobs.map((job) => job.id === id ? { ...job, status: 'cancelled' } : job) })),
  setFindingStatus: (id, status) => set((state) => ({ findings: state.findings.map((finding) => finding.id === id ? { ...finding, status } : finding) })),
  addReport: (report) => set((state) => ({ reports: [report, ...state.reports] })),
}));
