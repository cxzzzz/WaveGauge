from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from asteval import Interpreter
from wavekit import Waveform
from functools import lru_cache

try:
    from wavekit import VcdReader, FsdbReader
except ImportError:
    from wavekit import VcdReader

    FsdbReader = None


def format_asteval_error(aeval: Interpreter) -> str:
    error_msg = aeval.error_msg
    if isinstance(error_msg, str) and error_msg:
        return error_msg
    if error_msg:
        return '\n'.join(error_msg)
    if aeval.error:
        return '\n'.join(str(err) for err in aeval.error)
    return 'Unknown error'



class AnalysisEngine:


    @lru_cache(maxsize=128)
    def load_wave(self, path: str, clock: str = None) -> Any:
        wave = self.reader.load_wave(path, clock=clock)
        return wave

    @lru_cache(maxsize=128)
    def load_matched_waves(self, pattern: Any, clock: str = None, **kwargs: Any) -> Any:
        waves = self.reader.load_waves(pattern, clock=clock, **kwargs)
        return waves

    def execute_transform(
        self, code: str 
    ) -> Any:
        aeval = Interpreter(
            usersyms={'pd': pd, 'np': np, 'W': self.load_wave, 'MW': self.load_matched_waves}   
        )
        result = aeval(code)
        if aeval.error:
            raise RuntimeError(format_asteval_error(aeval))
        return result

    @staticmethod
    def get_reader_class(file_path: str) -> type:
        suffix = Path(file_path).suffix.lower()
        if suffix == '.vcd':
            return VcdReader
        if suffix == '.fsdb':
            if FsdbReader is None:
                raise ValueError('FsdbReader is not available in current wavekit build')
            return FsdbReader
        raise ValueError(f'Unsupported waveform file type: {suffix or "unknown"}')

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        self.reader_class = self.get_reader_class(file_path)
        self.reader = self.reader_class(file_path)
        self.reader.__enter__()

    def close(self) -> None:
        if self.reader:
            self.reader.__exit__(None, None, None)
            self.reader = None

    def _normalize_transform_result(self, transform_code: str) -> tuple[dict[str, Waveform], bool]:
        processed_data = self.execute_transform(transform_code)
        
        is_multivalue = isinstance(processed_data, dict)
        if not is_multivalue:
            processed_data = {'value': processed_data}
            
        return processed_data, is_multivalue

    def analyze(self, transform_code: str, sample_rate: int = 1, compressed: bool = False) -> dict[str, Any]:
        processed_data, is_multivalue = self._normalize_transform_result(transform_code)

        result: dict[str, Any] = {
            'timestamps': None, 
            'values': {},
            'is_multivalue': is_multivalue
        }

        if compressed:
            # 1. Compress all waveforms first
            compressed_waves = {}
            all_timestamps = []
            
            for key, value in processed_data.items():
                assert isinstance(value, Waveform), f'Expected Waveform value for key {key}'
                c_wave = value.compress()
                compressed_waves[key] = c_wave
                all_timestamps.append(c_wave.time)
            
            if not all_timestamps:
                result['timestamps'] = []
                return result

            # 2. Compute union of all timestamps
            unified_timestamps = np.unique(np.concatenate(all_timestamps))
            # np.unique returns sorted array
            
            result['timestamps'] = unified_timestamps.tolist()

            # 3. Resample all waveforms to unified timestamps using Zero-Order Hold
            for key, wave in compressed_waves.items():
                # searchsorted(side='right') - 1 gives the index of the latest timestamp <= t
                indices = np.searchsorted(wave.time, unified_timestamps, side='right') - 1
                indices = np.maximum(indices, 0)
                result['values'][key] = wave.value[indices].tolist()

        else:
            # Original resampling logic
            for key, value in processed_data.items():
                assert isinstance(value, Waveform), f'Expected Waveform value for key {key}'
                sampled_wave = value.sample(sample_rate, func=np.mean)
                result['values'][key] = sampled_wave.value.tolist()
                if result['timestamps'] is None:
                    result['timestamps'] = sampled_wave.time.tolist()
                else:
                    assert result['timestamps'] is None or np.array_equal(
                        sampled_wave.time, result['timestamps']
                    ), 'Sampled timestamps mismatch'
        
        return result