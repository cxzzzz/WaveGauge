from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import uvicorn
from engine import AnalysisEngine

app = FastAPI()

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


engines: dict[str, AnalysisEngine] = {}


def get_engine(file_path: str) -> AnalysisEngine:
    engine = engines.get(file_path)
    if engine is None:
        engine = AnalysisEngine(file_path)
        engines[file_path] = engine
    return engine


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        engine = get_engine(req.file_path)
        table_data = engine.analyze(req.transform_code)

        return {
            "status": "success",
            "data": table_data,
        }

    except Exception as e:
        logging.exception("Analyze request failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
