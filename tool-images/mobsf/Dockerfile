FROM opensecurity/mobile-security-framework-mobsf:latest
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -fsS http://localhost:8000/ || exit 1
CMD ["python3", "manage.py", "runserver", "0.0.0.0:8000", "--noreload"]
