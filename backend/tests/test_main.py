from app.main import app


def test_openapi_contains_protected_dispatch_routes():
    schema = app.openapi()
    assert "/api/v1/jobs" in schema["paths"]
    assert "/api/v1/mobile-analyses/{analysis_id}/scan" in schema["paths"]
    assert "/api/v1/social-assessments/{assessment_id}/impersonation-scan" in schema["paths"]
    assert len(schema["paths"]) >= 65
