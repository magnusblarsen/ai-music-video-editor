from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.core.config import get_hpc_config
from app.services.hpc_client import HpcClient

router = APIRouter(tags=["test"])


@router.get("/health/db")
def db_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"ok": True}


@router.post("/test-ssh")
async def test_ssh():
    settings = get_hpc_config()
    client = HpcClient(settings)

    try:
        result = await client.run_command("ls")
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSH connection failed: {e}")
