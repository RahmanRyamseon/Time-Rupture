"""Locating and running NASA Ames Stereo Pipeline command-line tools.

ASP is installed as a conda environment (see Dockerfile.worker). Its tools need the
environment's own variables: without ISISROOT they abort at start-up, and without
PROJ_DATA coordinate systems cannot be resolved. They are set here explicitly instead
of relying on shell activation.
"""
from __future__ import annotations

import os
import re
import subprocess
import time
from pathlib import Path

from app.engines.base import EngineError, EngineUnavailable, Log

_PROGRESS = re.compile(r"-->\s*\[|\[[*.]{10,}\]")  # progress bars would flood the job log
_TAIL_LINES = 25


class AspToolchain:
    def __init__(self, prefix: str, threads: int = 0):
        self.prefix = Path(prefix)
        self.bin = self.prefix / "bin"
        self.threads = threads

    def environment(self) -> dict[str, str]:
        env = dict(os.environ)
        env.update(
            {
                "PATH": f"{self.bin}{os.pathsep}{env.get('PATH', '')}",
                "ISISROOT": str(self.prefix),
                "PROJ_DATA": str(self.prefix / "share" / "proj"),
                "GDAL_DATA": str(self.prefix / "share" / "gdal"),
                "GDAL_DRIVER_PATH": str(self.prefix / "lib" / "gdalplugins"),
                # Never fetch grids from the internet: everything must work offline.
                "PROJ_NETWORK": "OFF",
            }
        )
        # The application's own Python must not leak into ASP's Python tools.
        for name in ("PYTHONPATH", "PYTHONHOME", "VIRTUAL_ENV"):
            env.pop(name, None)
        return env

    def tool(self, name: str) -> str:
        path = self.bin / name
        if not path.exists():
            raise EngineUnavailable(
                f"NASA Ames Stereo Pipeline tool '{name}' was not found under {self.prefix}. "
                "This step must run in the worker image, which has ASP installed "
                "(ASP_PREFIX points at its location)."
            )
        return str(path)

    def version(self) -> str:
        """e.g. '3.7.0 (build 3d1953916, 2026-06-09)'."""
        output = subprocess.run(
            [self.tool("point2dem"), "--version"],
            env=self.environment(),
            capture_output=True,
            text=True,
            timeout=120,
        )
        text = output.stdout + output.stderr
        version = re.search(r"Stereo Pipeline\s+(\S+)", text)
        if output.returncode != 0 or not version:
            raise EngineUnavailable(f"ASP is installed but does not run: {text.strip()[-500:]}")
        build = re.search(r"Build ID:\s*(\S+)", text)
        date = re.search(r"Build date:\s*(\S+)", text)
        extra = ", ".join(x.group(1) for x in (build, date) if x)
        return f"{version.group(1)} (build {extra})" if extra else version.group(1)

    def run(self, argv: list[str], log: Log, cwd: Path | None = None) -> str:
        """Run one tool, streaming its output to the job log. Returns the full output.

        `argv[0]` is the bare tool name. Raises EngineError with the tail of the output
        if the tool exits with a non-zero status.
        """
        command = [self.tool(argv[0]), *argv[1:]]
        log("$ " + " ".join(argv))
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=self.environment(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            errors="replace",
        )
        lines: list[str] = []
        pending: list[str] = []
        last_flush = time.monotonic()
        assert process.stdout is not None
        for raw in process.stdout:
            line = raw.rstrip()
            if not line.strip() or _PROGRESS.search(line):
                continue
            lines.append(line)
            pending.append(line)
            if len(pending) >= 40 or time.monotonic() - last_flush > 3:
                log("\n".join(pending))
                pending, last_flush = [], time.monotonic()
        if pending:
            log("\n".join(pending))
        code = process.wait()
        if code != 0:
            tail = "\n".join(lines[-_TAIL_LINES:])
            raise EngineError(f"{argv[0]} failed (exit status {code}).\n{tail}")
        return "\n".join(lines)
