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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
