import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

from .engine import AnalysisEngine

app = FastAPI()
frontend_dist = Path(__file__).resolve().parent.parent / 'frontend' / 'dist'

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    file_path: str
    transform_code: str = ""
    sample_rate: int = 1


engines: dict[str, AnalysisEngine] = {}
def get_engine(file_path: str, max_cache_num: int = 16) -> AnalysisEngine:
    engine = engines.get(file_path)
    if engine is None:
        if len(engines) >= max_cache_num:
            # Close the earliest engine
            earliest_file_path = next(iter(engines))
            engines[earliest_file_path].close()
            del engines[earliest_file_path]

        engine = AnalysisEngine(file_path)
        engines[file_path] = engine
    return engine


def resolve_frontend_path(request_path: str) -> Path | None:
    if not frontend_dist.is_dir():
        return None

    requested_path = (frontend_dist / request_path).resolve()
    if requested_path == frontend_dist:
        requested_path = frontend_dist / 'index.html'

    if frontend_dist not in requested_path.parents and requested_path != frontend_dist:
        return None

    if requested_path.is_file():
        return requested_path

    index_path = frontend_dist / 'index.html'
    if index_path.is_file():
        return index_path

    return None


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        print(req)
        engine = get_engine(req.file_path)
        table_data = engine.analyze(req.transform_code, req.sample_rate)

        return {
            "status": "success",
            "data": table_data,
        }

    except Exception as e:
        logging.exception("Analyze request failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get('/')
async def serve_frontend_root():
    response_path = resolve_frontend_path('index.html')
    if response_path is None:
        raise HTTPException(status_code=404, detail='Frontend not built')
    return FileResponse(response_path)


@app.get('/{path:path}')
async def serve_frontend(path: str):
    response_path = resolve_frontend_path(path)
    if response_path is None:
        raise HTTPException(status_code=404, detail='Frontend not built')
    return FileResponse(response_path)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
