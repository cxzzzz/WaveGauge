from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import uvicorn
import os
from engine import AnalysisEngine

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = AnalysisEngine()

class LoadRequest(BaseModel):
    path: str

class AnalyzeRequest(BaseModel):
    code: str

@app.post("/api/load")
async def load_wave(req: LoadRequest):
    try:
        engine.load_wave(req.path)
        return {"status": "success", "signals": engine.get_signals()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/upload")
async def upload_wave(file: UploadFile = File(...)):
    # Save to temp
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    engine.load_wave(temp_path)
    return {"status": "success", "signals": engine.get_signals()}

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        result = engine.execute(req.code)
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
