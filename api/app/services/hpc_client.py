import asyncssh

from app.core.config import Settings


class HpcClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def run(self, command: str, check: bool = True) -> str:
        async with asyncssh.connect(
            self.settings.hpc_host,
            username=self.settings.hpc_user,
            client_keys=[self.settings.hpc_ssh_key],
            known_hosts=self.settings.known_hosts,
        ) as conn:
            result = await conn.run(command, check=check)
            return result.stdout

    async def mkdir(self, remote_dir: str) -> None:
        await self.run(f"mkdir -p {remote_dir}", check=True)

    async def sftp_put(self, local_path: str, remote_path: str) -> None:
        async with asyncssh.connect(
            self.settings.hpc_host,
            username=self.settings.hpc_user,
            client_keys=[self.settings.hpc_ssh_key],
            known_hosts=self.settings.known_hosts,
        ) as conn:
            async with conn.start_sftp_client() as sftp:
                await sftp.put(local_path, remote_path)

    async def sftp_get(self, remote_path: str, local_path: str) -> None:
        async with asyncssh.connect(
            self.settings.hpc_host,
            username=self.settings.hpc_user,
            client_keys=[self.settings.hpc_ssh_key],
            known_hosts=self.settings.known_hosts,
        ) as conn:
            async with conn.start_sftp_client() as sftp:
                await sftp.get(remote_path, local_path)

    async def sftp_put_text(self, text: str, remote_path: str, encoding: str = "utf-8") -> None:
        # Write via SFTP by creating a temporary file content on remote using a heredoc.
        # Simple + avoids needing a temp local file.
        safe = text.replace("'", "'\"'\"'")  # minimal single-quote escaping for bash
        cmd = f"bash -lc 'cat > {remote_path} << \"__EOF__\"\n{safe}\n__EOF__\n'"
        await self.run(cmd, check=True)

        # Old way I did it:
        # tmp_local_job = Path("/tmp") / f"job_{uuid.uuid4()}.sbatch"
        # tmp_local_job.write_text(job_contents, encoding="utf-8")
