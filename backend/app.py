from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, List, Dict
import uvicorn
import pandas as pd
import numpy as np

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
    transform_code: Optional[str] = ""
    metric_code: Optional[str] = ""

def execute_transform(data: Any, code: str) -> Any:
    """
    Execute transform logic.
    Expected to modify 'data' or return new 'data'.
    """
    if not code.strip():
        return data
        
    local_scope = {"data": data, "pd": pd, "np": np}
    # We use exec to allow arbitrary python code including variable assignment
    exec(code, {}, local_scope)
    
    # We expect the user to either modify 'data' in place or assign new 'data' variable
    return local_scope.get("data", data)

def execute_metric(data: Any, code: str) -> Any:
    """
    Execute metric logic.
    Expected to return a value (number or dict).
    """
    if not code.strip():
        return 0
        
    # Wrap code in a function to support 'return'
    func_def = "def _metric_calc(data):\n"
    # Indent user code
    indented_code = "\n".join(["    " + line for line in code.splitlines()])
    full_code = func_def + indented_code
    
    local_scope = {"pd": pd, "np": np}
    exec(full_code, {}, local_scope)
    
    # Call the function
    return local_scope["_metric_calc"](data)

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        # 1. Load Waveform (Mocking WaveKit for now)
        # TODO: Replace with actual wavekit loading logic
        # data = wavekit.load(req.file_path) 
        
        # Mock data for demonstration purposes if file loading is not implemented
        # In a real scenario, this would come from the fsdb/vcd file
        data = pd.DataFrame({
            'timestamp': range(100),
            'sm_active': np.random.rand(100),
            'dram_read': np.random.rand(100) * 100,
            'dram_write': np.random.rand(100) * 100,
            'l2_hit': np.random.rand(100)
        })
        
        # 2. Transform Data
        processed_data = execute_transform(data, req.transform_code)
        
        # 3. Calculate Metrics
        metric_result = execute_metric(processed_data, req.metric_code)
        
        # 4. Prepare Response
        # Convert DataFrame to list of dicts for JSON response
        if isinstance(processed_data, pd.DataFrame):
            table_data = processed_data.reset_index().to_dict(orient='records')
            # Limit rows if too large? For now send all.
            if len(table_data) > 1000:
                table_data = table_data[:1000] # Safety limit
        else:
            table_data = [] # Or handle other types
            
        return {
            "status": "success",
            "data": table_data,
            "metrics": metric_result
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
