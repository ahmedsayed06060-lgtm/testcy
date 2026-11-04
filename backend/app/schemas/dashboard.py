from pydantic import BaseModel


class DashboardStats(BaseModel):
    active_engagements: int
    running_jobs: int
    open_findings: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    informational_findings: int


class TrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int
