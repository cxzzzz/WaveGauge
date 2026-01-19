from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any
from pathlib import Path
import logging
import uvicorn
import pandas as pd
import numpy as np
from asteval import Interpreter

try:
    from wavekit import VcdReader, FsdbReader
except ImportError:
    from wavekit import VcdReader

    FsdbReader = None

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
    metric_code: str = ""


def get_reader_class(file_path: str) -> type:
    suffix = Path(file_path).suffix.lower()
    if suffix == ".vcd":
        return VcdReader
    if suffix == ".fsdb":
        if FsdbReader is None:
            raise ValueError("FsdbReader is not available in current wavekit build")
        return FsdbReader
    raise ValueError(f"Unsupported waveform file type: {suffix or 'unknown'}")


def build_interpreter(reader: Any, data: Any) -> Interpreter:
    def load_wave(path: str, **kwargs: Any) -> Any:
        return reader.load_wave(path, **kwargs)

    def load_waves(paths: Any, **kwargs: Any) -> Any:
        if "clock" in kwargs:
            clock = kwargs.pop("clock")
            return [reader.load_wave(path, clock=clock, **kwargs) for path in paths]
        return reader.load_waves(paths, **kwargs)

    return Interpreter(
        usersyms={"data": data, "pd": pd, "np": np, "W": load_wave, "WS": load_waves}
    )


def format_asteval_error(aeval: Interpreter) -> str:
    error_msg = aeval.error_msg
    if isinstance(error_msg, str) and error_msg:
        return error_msg
    if error_msg:
        return "\n".join(error_msg)
    if aeval.error:
        return "\n".join(str(err) for err in aeval.error)
    return "Unknown error"


def execute_transform(reader: Any, code: str, data: Any = None) -> Any:
    if not code.strip():
        return data

    aeval = build_interpreter(reader, data)
    aeval(code)
    if aeval.error:
        raise RuntimeError(format_asteval_error(aeval))
    return aeval.symtable.get("data", data)


def execute_metric(reader: Any, data: Any, code: str) -> Any:
    if not code.strip():
        return 0

    aeval = build_interpreter(reader, data)
    result = aeval(code)
    if aeval.error:
        raise RuntimeError(format_asteval_error(aeval))
    return result


def convert_numpy(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(v) for v in obj]
    else:
        return obj


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        reader_class = get_reader_class(req.file_path)
        with reader_class(req.file_path) as reader:
            processed_data = execute_transform(reader, req.transform_code)
            metric_result = execute_metric(reader, processed_data, req.metric_code)

        if isinstance(processed_data, pd.DataFrame):
            table_data = processed_data.reset_index().to_dict(orient="records")
            if len(table_data) > 1000:
                table_data = table_data[:1000]
        else:
            table_data = []

        return {
            "status": "success",
            "data": table_data,
            "metrics": convert_numpy(metric_result),
        }

    except Exception as e:
        logging.exception("Analyze request failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
