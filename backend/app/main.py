"""FastAPI app: CORS, error handlers, routers under /api/v1, startup create_all + seed."""
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import (auth, consents, demo, fairness, lender, loans, me, offers, privacy, scores, statements,
                     transactions, wellness)
from app.config import settings
from app.db import Base, engine
from app.errors import install_handlers
from app.seed import seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("sahayakfin")


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("Database dialect: %s", engine.dialect.name)
    Base.metadata.create_all(engine)
    if not settings.samples_dir.is_dir():
        log.warning("SAMPLES_DIR %s not found: AA fetch, demo samples and Fairness Lab need "
                    "`python data/generate_personas.py`", settings.samples_dir)
    seed(with_data=os.getenv("SEED_DEMO_DATA", "true").lower() == "true")
    yield


app = FastAPI(title="SahayakFin API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["Authorization", "Content-Type"])
install_handlers(app)


@app.middleware("http")
async def timing(request: Request, call_next):
    # Method, path, status and time only: never bodies, query strings or headers (no personal data in logs).
    t0 = time.perf_counter()
    response = await call_next(request)
    log.info("%s %s %s %.0fms", request.method, request.url.path, response.status_code,
             (time.perf_counter() - t0) * 1000)
    return response


API = "/api/v1"


@app.get(f"{API}/health", tags=["health"])
def health():
    return {"ok": True}


for module in (auth, me, consents, statements, transactions, scores, offers, loans, wellness, privacy, lender,
               fairness, demo):
    app.include_router(module.router, prefix=API)
