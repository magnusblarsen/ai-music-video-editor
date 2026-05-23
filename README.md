
## Running the project with Docker Compose

Use Docker Compose to run the project locally.

For access to the HPC environment over SSH, the API needs a `.env` file with the following variables:

- `HPC_HOST`: hostname of the HPC server
- `HPC_USER`: your username on the HPC server
- `HPC_BASE`: base path to your home directory on the HPC server, for example `/home/user`
- `HPC_SSH_KEY`: path to the private SSH key inside the container, for example `/run/secrets/id_rsa`
- `DATABASE_URL`: PostgreSQL connection string, for example `postgresql://postgres:password@db:5432/app`

Start the containers with:

```bash
docker compose up -d
```
