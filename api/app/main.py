from fastapi import FastAPI

app = FastAPI(title="Video Generation API")


@app.get("/test")
def health():
    return {"status": "ok"}
