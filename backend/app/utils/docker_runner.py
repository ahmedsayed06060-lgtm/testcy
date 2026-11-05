"""Constrained, argument-array-only Docker execution for approved tool jobs."""

import asyncio
from dataclasses import dataclass
from pathlib import Path

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
        return "cyberops-nmap", ["nmap", *flags, *job.targets, "-oX", f"/output/{job.id}.xml"]
    if job.job_type == JobType.TESTSSL_SCAN and len(job.targets) == 1:
        return "cyberops-testssl", [
            "testssl.sh",
            "--jsonfile",
            f"/output/{job.id}.json",
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
                f"/output/{job.id}.jsonl",
            ]
        )
        return "cyberops-nuclei", command
    if job.job_type == JobType.ZAP_SCAN and len(job.targets) == 1:
        mode = {ScanProfile.LIGHT: "-m 3", ScanProfile.STANDARD: "-m 5", ScanProfile.DEEP: "-a"}[
            job.profile
        ]
        return "cyberops-zap", [
            "/zap/zap-baseline.py",
            "-t",
            job.targets[0],
            "-J",
            f"/output/{job.id}.json",
            *mode.split(),
        ]
    if job.job_type == JobType.OSINT_SCAN:
        return "cyberops-osint", ["python", "/app/public_assessment.py", *job.targets]
    raise ValueError("Unsupported tool or target combination")


def _artifact_path(job: Job) -> Path | None:
    extensions = {
        JobType.NMAP_SCAN: ".xml",
        JobType.TESTSSL_SCAN: ".json",
        JobType.NUCLEI_SCAN: ".jsonl",
        JobType.ZAP_SCAN: ".json",
    }
    extension = extensions.get(job.job_type)
    return Path(settings.tool_output_dir) / f"{job.id}{extension}" if extension else None


def _read_artifact(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        with path.open("rb") as artifact:
            payload = artifact.read(50_000_001)
        truncated = "\n[output truncated at 50 MB]" if len(payload) > 50_000_000 else ""
        return payload[:50_000_000].decode("utf-8", errors="replace") + truncated
    finally:
        path.unlink(missing_ok=True)


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
        settings.tool_docker_network,
        "--memory=2g",
        "--cpus=1.0",
        "--pids-limit=256",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--user",
        "10001:10001",
        "--volume",
        f"{settings.tool_output_volume}:/output:rw",
        "--entrypoint",
        "",
        "--stop-timeout=5",
        image,
        *command,
    ]
    process = await asyncio.create_subprocess_exec(
        *docker, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    timeout = min(settings.default_job_timeout_minutes, settings.max_job_timeout_minutes) * 60
    artifact_path = _artifact_path(job)
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
    except TimeoutError:
        process.kill()
        await process.communicate()
        if artifact_path:
            await asyncio.to_thread(artifact_path.unlink, True)
        raise
    artifact = await asyncio.to_thread(_read_artifact, artifact_path) if artifact_path else ""
    stdout_text = stdout.decode("utf-8", errors="replace")
    if artifact:
        stdout_text = f"{stdout_text}\n{artifact}" if stdout_text else artifact
    return ToolResult(
        stdout_text,
        stderr.decode("utf-8", errors="replace"),
        process.returncode or 0,
    )
