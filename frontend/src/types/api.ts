export interface ApiPagination { page: number; limit: number; total: number; pages: number }
export interface ListParams { page?: number; limit?: number; search?: string; [key: string]: string | number | boolean | null | undefined }
export type Role = 'admin' | 'engagement_manager' | 'pentester' | 'analyst' | 'client';

export interface ApiUser {
  id: string; email: string; full_name: string; role: Role; client_id: string | null;
  is_active: boolean; mfa_enabled: boolean; last_login_at?: string | null; created_at: string;
}
export interface ApiClient {
  id: string; company_name: string; industry: string | null; contact_name: string | null;
  contact_email: string | null; contact_phone: string | null; notes: string | null;
  created_at: string; updated_at: string;
}
export interface ApiEngagement {
  id: string; client_id: string; name: string; type: string; status: string;
  start_date: string; end_date: string; testing_window_start: string | null;
  testing_window_end: string | null; testing_window_timezone: string;
  rules_of_engagement: string; emergency_contact_name: string; emergency_contact_phone: string;
  emergency_contact_email: string | null; created_by: string; created_at: string; updated_at: string;
}
export interface ApiScopeItem {
  id: string; engagement_id: string; asset_type: 'ip' | 'cidr' | 'domain' | 'url' | 'app_id' | 'social_account';
  value: string; in_scope: boolean; ownership_verified: boolean;
  verification_method: 'dns_txt' | 'file_upload' | 'manual_admin' | null;
  verification_token: string | null; verified_at: string | null; notes: string | null;
}
export interface ApiAuthorizationDoc {
  id: string; engagement_id: string; doc_type: 'contract' | 'authorization_letter' | 'nda' | 'scope_addendum' | 'phishing';
  original_filename: string; file_size: number; mime_type: string; sha256_hash: string;
  uploaded_by: string; approved: boolean | null; approved_by: string | null;
  approved_at: string | null; rejection_reason: string | null; created_at: string;
}
export interface ApiJob {
  id: string; engagement_id: string; job_type: string; targets: string[]; tool: string;
  profile: 'light' | 'standard' | 'deep'; parameters: Record<string, unknown>; status: string;
  started_at: string | null; completed_at: string | null; duration_seconds: number | null;
  raw_output_path: string | null; error_message: string | null; triggered_by: string;
  created_at: string; updated_at: string;
}
export interface ApiFinding {
  id: string; engagement_id: string; job_id: string | null; title: string; description: string;
  business_impact: string | null; affected_asset: string; severity: string; status: string;
  cvss_vector: string | null; cvss_score: number | null; cwe_id: string | null;
  owasp_category: string | null; evidence: string | null; remediation: string | null;
  assigned_to: string | null; found_by: string | null; tags: string[];
  comments: Array<{ id: string; author: string; text: string; created_at: string }>;
  evidence_files: Array<{ id: string; filename: string; size: number; mime_type: string }>;
  created_at: string; updated_at: string;
}
export interface ApiReport {
  id: string; engagement_id: string; report_type: 'executive_summary' | 'technical_report' | 'remediation_plan' | 'full';
  language: 'en' | 'ar'; format: 'pdf' | 'docx'; file_path: string; file_size: number | null;
  generated_by: string; created_at: string;
}
export interface ApiSocialAssessment {
  id: string; engagement_id: string; platform: string; account_handle: string;
  checklist_results: Record<string, boolean | null>; posture_score: number | null;
  impersonation_findings: Array<Record<string, unknown>>; notes: string | null;
}
export interface ApiPhishingCampaign {
  id: string; engagement_id: string; name: string; status: string; approval_doc_id: string;
  targets?: Array<{ email: string; department: string }>; subject_line: string;
  sent_count: number; opened_count: number; clicked_count: number; reported_count: number;
  started_at: string | null; completed_at: string | null; created_at: string;
}
export interface ApiCampaignMetrics {
  sent: number; opened: number; clicked: number; reported: number;
  departments: Array<{ name: string; sent: number; opened: number; clicked: number; reported: number }>;
  individual_tracking: false;
}
export interface ApiMobileAnalysis {
  id: string; engagement_id: string; app_name: string; platform: 'android' | 'ios';
  package_name: string | null; version: string | null; file_hash_sha256: string | null;
  mobsf_scan_id: string | null; static_results: Record<string, unknown> | null;
  manual_checklist: Record<string, boolean | null>; masvs_mappings: Array<Record<string, unknown>>;
  created_at: string; updated_at: string;
}
export interface ApiNotification { id: string; title: string; message: string; type: string; read: boolean; created_at: string }
export interface ApiAuditLog {
  id: string; timestamp: string; user_id: string | null; action: string; resource_type: string;
  resource_id: string | null; details: Record<string, unknown>; ip_address: string | null;
}
export interface ApiDashboardStats {
  active_engagements: number; running_jobs: number; open_findings: number; severity: Record<string, number>;
}
export interface ApiUserSession { id: string; ip_address: string | null; user_agent: string | null; created_at: string; expires_at: string }

export type EngagementInput = Pick<ApiEngagement, 'client_id' | 'name' | 'type' | 'start_date' | 'end_date' | 'rules_of_engagement' | 'emergency_contact_name' | 'emergency_contact_phone'> & Partial<Pick<ApiEngagement, 'testing_window_start' | 'testing_window_end' | 'testing_window_timezone' | 'emergency_contact_email'>>;
export type FindingInput = Pick<ApiFinding, 'engagement_id' | 'title' | 'description' | 'affected_asset' | 'severity'> & Partial<Pick<ApiFinding, 'business_impact' | 'cvss_vector' | 'cvss_score' | 'cwe_id' | 'owasp_category' | 'evidence' | 'remediation' | 'tags'>>;
export type ReportInput = Pick<ApiReport, 'engagement_id' | 'report_type' | 'language' | 'format'>;
