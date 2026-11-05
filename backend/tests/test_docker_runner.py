import uuid
from unittest.mock import AsyncMock, Mock

import pytest

from app.config import settings
from app.models.job import Job, JobType, ScanProfile
from app.utils.docker_runner import (
    _artifact_path,
    _read_artifact,
    run_sandboxed_tool,
    tool_invocation,
)


def make_job(job_type: JobType, profile: ScanProfile = ScanProfile.STANDARD, targets=None):
    return Job(
        id=uuid.uuid4(),
        engagement_id=uuid.uuid4(),
        job_type=job_type,
        targets=targets or ["example.com"],
        tool="test",
        profile=profile,
        parameters={"ignored": "; touch /tmp/never"},
        triggered_by=uuid.uuid4(),
    )


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_nmap_invocation_is_profile_allowlisted(profile):
    image, command = tool_invocation(make_job(JobType.NMAP_SCAN, profile, ["10.0.0.1", "10.0.0.2"]))
    assert image == "cyberops-nmap"
    assert command[0] == "nmap" and command[-2:] == ["-oX", command[-1]]
    assert "ignored" not in command and "; touch /tmp/never" not in command
    assert ("-p-" in command) == (profile == ScanProfile.DEEP)


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_nuclei_invocation_uses_fixed_templates_and_rates(profile):
    image, command = tool_invocation(make_job(JobType.NUCLEI_SCAN, profile))
    assert image == "cyberops-nuclei"
    assert command[:3] == ["nuclei", "-u", "example.com"]
    assert command[command.index("-rate-limit") + 1] in {"50", "100", "150"}
    assert "-jsonl" in command


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_single_target_tools_use_fixed_entrypoints(profile):
    for job_type, image, executable in (
        (JobType.TESTSSL_SCAN, "cyberops-testssl", "testssl.sh"),
        (JobType.ZAP_SCAN, "cyberops-zap", "/zap/zap-baseline.py"),
    ):
        actual_image, command = tool_invocation(
            make_job(job_type, profile, ["https://example.com"])
        )
        assert actual_image == image and command[0] == executable
        assert "https://example.com" in command


def test_osint_and_unsupported_invocations():
    image, command = tool_invocation(make_job(JobType.OSINT_SCAN, targets=["social:brand"]))
    assert image == "cyberops-osint" and command[-1] == "social:brand"
    with pytest.raises(ValueError, match="Unsupported"):
        tool_invocation(make_job(JobType.CUSTOM))
    with pytest.raises(ValueError, match="Unsupported"):
        tool_invocation(make_job(JobType.ZAP_SCAN, targets=["a", "b"]))


def test_artifact_paths_and_missing_artifact(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "tool_output_dir", str(tmp_path))
    job = make_job(JobType.NMAP_SCAN)
    path = _artifact_path(job)
    assert path == tmp_path / f"{job.id}.xml"
    assert _read_artifact(path) == ""
    path.write_bytes(b"<nmap>\xff</nmap>")
    assert "<nmap>" in _read_artifact(path)
    assert not path.exists()
    assert _artifact_path(make_job(JobType.OSINT_SCAN)) is None


@pytest.mark.asyncio
async def test_sandbox_flags_artifact_capture_and_cleanup(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "tool_output_dir", str(tmp_path))
    monkeypatch.setattr(settings, "tool_output_volume", "authorized-output")
    monkeypatch.setattr(settings, "tool_docker_network", "authorized-egress")
    job = make_job(JobType.NMAP_SCAN)
    (tmp_path / f"{job.id}.xml").write_text("<nmaprun/>")
    process = Mock(returncode=0)
    process.communicate = AsyncMock(return_value=(b"console", b"warning"))
    process.kill = Mock()
    create = AsyncMock(return_value=process)
    monkeypatch.setattr("app.utils.docker_runner.asyncio.create_subprocess_exec", create)
    result = await run_sandboxed_tool(job)
    assert result.exit_code == 0 and "console" in result.stdout and "<nmaprun/>" in result.stdout
    assert result.stderr == "warning"
    argv = create.call_args.args
    assert argv[:2] == ("docker", "run")
    for flag in (
        "--rm",
        "--read-only",
        "--memory=2g",
        "--cpus=1.0",
        "--pids-limit=256",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
    ):
        assert flag in argv
    assert argv[argv.index("--network") + 1] == "authorized-egress"
    assert argv[argv.index("--volume") + 1] == "authorized-output:/output:rw"
    assert "--privileged" not in argv and not (tmp_path / f"{job.id}.xml").exists()
    process.kill.assert_not_called()


@pytest.mark.asyncio
async def test_timeout_kills_container_and_removes_artifact(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "tool_output_dir", str(tmp_path))
    monkeypatch.setattr(settings, "default_job_timeout_minutes", 0)
    job = make_job(JobType.NUCLEI_SCAN)
    artifact = tmp_path / f"{job.id}.jsonl"
    artifact.write_text("partial")
    process = Mock(returncode=None)
    process.communicate = AsyncMock(return_value=(b"", b""))
    process.kill = Mock()
    monkeypatch.setattr(
        "app.utils.docker_runner.asyncio.create_subprocess_exec", AsyncMock(return_value=process)
    )
    with pytest.raises(TimeoutError):
        await run_sandboxed_tool(job)
    process.kill.assert_called_once()
    assert process.communicate.await_count >= 1
    assert not artifact.exists()
