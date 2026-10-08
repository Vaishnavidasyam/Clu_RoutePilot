import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from backend.app.database.session import Base, engine
from backend.app.api import auth, data, customers, executives, optimization, executive_portal, admin, demo, analytics

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Daily Visit Planner API",
    description="Intelligent Route Optimization Platform for Field Collections",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(customers.router)
app.include_router(executives.router)
app.include_router(optimization.router)
app.include_router(executive_portal.router)
app.include_router(admin.router)
app.include_router(demo.router)
app.include_router(analytics.router)

from backend.app.services.datetime_service import get_system_time_payload

@app.get("/api/system/time")
def get_system_time():
    payload = get_system_time_payload()
    return {
        "success": True,
        "data": payload,
        **payload
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Daily Visit Planner Optimization Engine",
        "version": "1.0.0",
        "constraints_engine": "13/13 hard constraints active",
        "models": ["Baseline", "Smart Greedy", "2-Opt Local Search"]
    }

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path in ("docs", "redoc", "openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
