import asyncio
from email.message import EmailMessage

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings
from app.database import SessionFactory
from app.models.user import User
from app.tasks.celery_app import celery_app

templates = Environment(
    loader=FileSystemLoader("app/templates/emails"),
    autoescape=select_autoescape(["html", "xml"]),
)


async def _deliver(recipient: str, subject: str, html: str) -> None:
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content("This notification requires an HTML-capable email client.")
    message.add_alternative(html, subtype="html")
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username or None,
        password=settings.smtp_password or None,
        start_tls=settings.smtp_tls,
        timeout=15,
    )


@celery_app.task(autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=2)
def send_security_email(user_id: str, title: str, message: str) -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            user = await db.get(User, user_id)
            if not user or not user.is_active:
                return
            html = templates.get_template("base.html").render(
                title=title, message=message, frontend_url=settings.frontend_url
            )
            await _deliver(user.email, title, html)

    asyncio.run(run())


@celery_app.task(autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=2)
def send_password_reset_email(email: str, token: str) -> None:
    reset_url = f"{settings.frontend_url}/en/reset-password?token={token}"
    html = templates.get_template("password_reset.html").render(reset_url=reset_url)
    asyncio.run(_deliver(email, "Reset your CyberOps Hub password", html))


@celery_app.task(autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=2)
def send_generic_email(recipient: str, subject: str, message: str) -> None:
    html = templates.get_template("base.html").render(
        title=subject, message=message, frontend_url=settings.frontend_url
    )
    asyncio.run(_deliver(recipient, subject, html))
