"""Constrained, argument-array-only Docker execution for approved tool jobs."""

import asyncio
from dataclasses import dataclass

from app.config import settings
from app.models.job import Job, JobType, ScanProfile


@dataclass(frozen=True)
class ToolResult:
    stdout: str
    stderr: str
    exit_code: int


def tool_invocation(job: Job) -> tuple[str, list[str]]:
    """Build an allowlisted image/command; user parameters never become CLI arguments."""
    if job.job_type == JobType.NMAP_SCAN:
        flags = {
            ScanProfile.LIGHT: ["-sV", "--top-ports", "100", "-T3", "--max-retries", "2"],
            ScanProfile.STANDARD: ["-sV", "-sC", "--top-ports", "1000", "-T3"],
            ScanProfile.DEEP: [
                "-sV",
                "-sC",
                "-p-",
                "-T3",
                "--script=default,vuln",
                "--max-retries",
                "3",
            ],
        }[job.profile]
        return "cyberops-nmap", ["nmap", *flags, *job.targets, "-oX", "/output/scan.xml"]
    if job.job_type == JobType.TESTSSL_SCAN and len(job.targets) == 1:
        return "cyberops-testssl", [
            "testssl.sh",
            "--jsonfile",
            "/output/results.json",
            "--severity",
            "LOW",
            "--color",
            "0",
            job.targets[0],
        ]
    if job.job_type == JobType.NUCLEI_SCAN:
        profile = {
            ScanProfile.LIGHT: (["cves/"], "critical,high", "50"),
            ScanProfile.STANDARD: (
                ["cves/", "vulnerabilities/", "misconfiguration/"],
                "critical,high,medium",
                "100",
            ),
            ScanProfile.DEEP: (
                ["cves/", "vulnerabilities/", "misconfiguration/", "exposures/", "technologies/"],
                "critical,high,medium,low",
                "150",
            ),
        }[job.profile]
        templates, severities, rate = profile
        command = ["nuclei"]
        for target in job.targets:
            command.extend(["-u", target])
        command.extend(
            [
                "-t",
                ",".join(templates),
                "-severity",
                severities,
                "-rate-limit",
                rate,
                "-c",
                "10",
                "-jsonl",
                "-o",
                "/output/results.jsonl",
            ]
        )
        return "cyberops-nuclei", command
    if job.job_type == JobType.ZAP_SCAN and len(job.targets) == 1:
        mode = {ScanProfile.LIGHT: "-m 3", ScanProfile.STANDARD: "-m 5", ScanProfile.DEEP: "-a"}[
            job.profile
        ]
        return "cyberops-zap", [
            "zap-baseline.py",
            "-t",
            job.targets[0],
            "-J",
            "/output/results.json",
            *mode.split(),
        ]
    if job.job_type == JobType.OSINT_SCAN:
        return "cyberops-osint", ["python", "/app/public_assessment.py", *job.targets]
    raise ValueError("Unsupported tool or target combination")


async def run_sandboxed_tool(job: Job) -> ToolResult:
    image, command = tool_invocation(job)
    docker = [
        "docker",
        "run",
        "--rm",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=256m",  # noqa: S108 - required sandbox tmpfs
        "--network",
        "cyberops-egress",
        "--memory=2g",
        "--cpus=1.0",
        "--pids-limit=256",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--user",
        "10001:10001",
        "--stop-timeout=5",
        image,
        *command,
    ]
    process = await asyncio.create_subprocess_exec(
        *docker, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    timeout = min(settings.default_job_timeout_minutes, settings.max_job_timeout_minutes) * 60
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
    except TimeoutError:
        process.kill()
        await process.communicate()
        raise
    return ToolResult(
        stdout.decode("utf-8", errors="replace"),
        stderr.decode("utf-8", errors="replace"),
        process.returncode or 0,
    )
