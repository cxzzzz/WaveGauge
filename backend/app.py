from __future__ import annotations

import logging
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

try:
    from .engine import (
        AnalysisEngine,
        CompleteAnalysisResult,
        CounterAnalysisResult,
        InstantAnalysisResult,
    )
except ImportError:
    from engine import (
        AnalysisEngine,
        CompleteAnalysisResult,
        CounterAnalysisResult,
        InstantAnalysisResult,
    )

app = FastAPI()
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeBaseRequest(BaseModel):
    file_path: str
    transform_code: str = ""


class AnalyzeInstantRequest(AnalyzeBaseRequest):
    pass


class AnalyzeCounterRequest(AnalyzeBaseRequest):
    sample_rate: int = 1


class AnalyzeCompleteRequest(AnalyzeBaseRequest):
    pass


class AnalyzeCounterResponse(BaseModel):
    status: str
    data: CounterAnalysisResult


class AnalyzeInstantResponse(BaseModel):
    status: str
    data: InstantAnalysisResult


class AnalyzeCompleteResponse(BaseModel):
    status: str
    data: CompleteAnalysisResult


ENGINES: dict[str, AnalysisEngine] = {}


def get_engine(file_path: str, max_cache_num: int = 16) -> AnalysisEngine:
    engine = ENGINES.get(file_path)
    if engine is None:
        if len(ENGINES) >= max_cache_num:
            earliest_file_path = next(iter(ENGINES))
            ENGINES[earliest_file_path].close()
            del ENGINES[earliest_file_path]

        engine = AnalysisEngine(file_path)
        ENGINES[file_path] = engine
    return engine


def resolve_frontend_path(request_path: str) -> Path | None:
    if not frontend_dist.is_dir():
        return None

    requested_path = (frontend_dist / request_path).resolve()
    if requested_path == frontend_dist:
        requested_path = frontend_dist / "index.html"

    if frontend_dist not in requested_path.parents and requested_path != frontend_dist:
        return None

    if requested_path.is_file():
        return requested_path

    index_path = frontend_dist / "index.html"
    if index_path.is_file():
        return index_path

    return None


def format_exception_detail(error: Exception) -> str:
    message = str(error).strip()
    error_type = type(error).__name__
    if message:
        return f"{error_type}: {message}"
    return error_type


@app.post("/api/analyze/instant", response_model=AnalyzeInstantResponse)
async def analyze_instant(req: AnalyzeInstantRequest) -> AnalyzeInstantResponse:
    try:
        engine = get_engine(req.file_path)
        table_data = engine.analyze_instant(req.transform_code)

        return AnalyzeInstantResponse(status="success", data=table_data)

    except Exception as e:
        logging.exception("Analyze instant request failed")
        raise HTTPException(status_code=500, detail=format_exception_detail(e)) from e


@app.post("/api/analyze/counter", response_model=AnalyzeCounterResponse)
async def analyze_counter(req: AnalyzeCounterRequest) -> AnalyzeCounterResponse:
    try:
        print(req)
        engine = get_engine(req.file_path)
        table_data = engine.analyze_counter(req.transform_code, req.sample_rate)

        return AnalyzeCounterResponse(status="success", data=table_data)

    except Exception as e:
        logging.exception("Analyze counter request failed")
        raise HTTPException(status_code=500, detail=format_exception_detail(e)) from e


@app.post("/api/analyze/complete", response_model=AnalyzeCompleteResponse)
async def analyze_complete(req: AnalyzeCompleteRequest) -> AnalyzeCompleteResponse:
    try:
        engine = get_engine(req.file_path)
        table_data = engine.analyze_complete(req.transform_code)

        return AnalyzeCompleteResponse(status="success", data=table_data)

    except Exception as e:
        logging.exception("Analyze complete request failed")
        raise HTTPException(status_code=500, detail=format_exception_detail(e)) from e


@app.get("/")
async def serve_frontend_root():
    response_path = resolve_frontend_path("index.html")
    if response_path is None:
        raise HTTPException(status_code=404, detail="Frontend not built")
    return FileResponse(response_path)


@app.get("/{path:path}")
async def serve_frontend(path: str):
    response_path = resolve_frontend_path(path)
    if response_path is None:
        raise HTTPException(status_code=404, detail="Frontend not built")
    return FileResponse(response_path)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
