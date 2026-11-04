"""Import all persistent models so Alembic sees the complete metadata."""

from app.models.audit_log import AuditLog
from app.models.authorization_doc import AuthorizationDoc, AuthorizationDocType
from app.models.base import Base
from app.models.client import Client
from app.models.engagement import (
    Engagement,
    EngagementRole,
    EngagementStatus,
    EngagementType,
    EngagementUser,
)
from app.models.finding import Finding, FindingStatus, Severity
from app.models.job import Job, JobStatus, JobType, ScanProfile
from app.models.mobile_analysis import MobileAnalysis, MobilePlatform
from app.models.notification import Notification
from app.models.phishing_campaign import CampaignStatus, PhishingCampaign
from app.models.report import Report, ReportFormat, ReportLanguage, ReportType
from app.models.scope import AssetType, ScopeItem, VerificationMethod
from app.models.social_assessment import SocialAssessment, SocialPlatform
from app.models.system_setting import SystemSetting
from app.models.user import MFABackupCode, Role, User, UserSession

__all__ = [
    "AuditLog",
    "AuthorizationDoc",
    "AuthorizationDocType",
    "Base",
    "Client",
    "Engagement",
    "EngagementRole",
    "EngagementStatus",
    "EngagementType",
    "EngagementUser",
    "Finding",
    "FindingStatus",
    "Severity",
    "Job",
    "JobStatus",
    "JobType",
    "ScanProfile",
    "MobileAnalysis",
    "MobilePlatform",
    "Notification",
    "CampaignStatus",
    "PhishingCampaign",
    "Report",
    "ReportFormat",
    "ReportLanguage",
    "ReportType",
    "AssetType",
    "ScopeItem",
    "VerificationMethod",
    "SocialAssessment",
    "SocialPlatform",
    "SystemSetting",
    "MFABackupCode",
    "Role",
    "User",
    "UserSession",
]
