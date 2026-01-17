import numpy as np
import os

class WaveForm:
    def __init__(self, path=None):
        self.path = path
        # Mock data for testing
        self.signals = {
            'top.clk': np.array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1] * 10),
            'top.valid': np.array([0, 0, 1, 1, 0, 1, 0, 0, 1, 1] * 10),
            'top.ready': np.array([0, 1, 1, 0, 0, 1, 1, 0, 0, 1] * 10),
            'top.data': np.arange(100)
        }
        
    def __getitem__(self, key):
        if key in self.signals:
            return self.signals[key]
        raise KeyError(f"Signal {key} not found")
        
    def keys(self):
        return list(self.signals.keys())

def load(path):
    print(f"Loading waveform from {path}")
    if not os.path.exists(path) and not path.startswith("/tmp"):
         # For testing we allow non-existent paths if it's just a mock
         pass
    return WaveForm(path)
