from fastapi import FastAPI
from datetime import datetime

# 创建 FastAPI 应用实例
app = FastAPI(title="Project Updates API", version="1.0.0")

@app.get("/")
def read_root():
    return {
        "message": "Project Updates API on Vercel!",
        "timestamp": datetime.now().isoformat(),
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}