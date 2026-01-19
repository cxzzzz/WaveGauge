import wavekit
import asteval
import numpy as np


class AnalysisEngine:
    def __init__(self):
        self.wave = None
        self.interpreter = asteval.Interpreter()

    def load_wave(self, path):
        self.wave = wavekit.load(path)
        # Reset interpreter with new context
        self.interpreter.symtable["w"] = self.wave
        self.interpreter.symtable["np"] = np

    def get_signals(self):
        if self.wave:
            return self.wave.keys()
        return []

    def execute(self, code):
        if not self.wave:
            raise ValueError("No waveform loaded")

        # Clear errors
        self.interpreter.error = []
        self.interpreter.error_msg = []

        # Run the code
        res = self.interpreter.eval(code)

        if len(self.interpreter.error) > 0:
            raise RuntimeError("\n".join(self.interpreter.error_msg))

        # Handle numpy serialization
        if isinstance(res, np.ndarray):
            return res.tolist()
        if isinstance(res, (np.integer, np.floating)):
            return res.item()

        return res
