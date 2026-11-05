from fastapi import APIRouter

from app.api.v1 import (
    admin,
    audit,
    auth,
    authorization_docs,
    clients,
    dashboard,
    engagements,
    findings,
    jobs,
    mobile,
    notifications,
    phishing,
    reports,
    scope,
    social,
    users,
)

api_router = APIRouter()
for module in (
    auth,
    users,
    clients,
    engagements,
    scope,
    authorization_docs,
    jobs,
    findings,
    reports,
    social,
    phishing,
    mobile,
    dashboard,
    audit,
    notifications,
    admin,
):
    api_router.include_router(module.router)
api_router.include_router(notifications.ws_router)
