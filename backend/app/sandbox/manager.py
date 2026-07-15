from dataclasses import dataclass

@dataclass
class SandboxResult:
    ok: bool
    output: str

class SandboxManager:
    def execute(self, _script: str) -> SandboxResult:
        return SandboxResult(False, "Sandbox execution is disabled until a Docker runtime and allowlist are configured.")

sandbox = SandboxManager()
