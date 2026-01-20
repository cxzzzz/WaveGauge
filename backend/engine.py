from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from asteval import Interpreter

try:
    from wavekit import VcdReader, FsdbReader
except ImportError:
    from wavekit import VcdReader

    FsdbReader = None


def get_reader_class(file_path: str) -> type:
    suffix = Path(file_path).suffix.lower()
    if suffix == '.vcd':
        return VcdReader
    if suffix == '.fsdb':
        if FsdbReader is None:
            raise ValueError('FsdbReader is not available in current wavekit build')
        return FsdbReader
    raise ValueError(f'Unsupported waveform file type: {suffix or "unknown"}')


def build_interpreter(reader: Any, data: Any, context: dict[str, Any]) -> Interpreter:
    def load_wave(path: str, **kwargs: Any) -> Any:
        wave = reader.load_wave(path, **kwargs)
        if context.get('timestamps') is None:
            context['timestamps'] = wave.time
        return wave

    def load_waves(paths: Any, **kwargs: Any) -> Any:
        if 'clock' in kwargs:
            clock = kwargs.pop('clock')
            waves = [reader.load_wave(path, clock=clock, **kwargs) for path in paths]
        else:
            waves = reader.load_waves(paths, **kwargs)
        if context.get('timestamps') is None and waves:
            context['timestamps'] = waves[0].time
        return waves

    return Interpreter(
        usersyms={'data': data, 'pd': pd, 'np': np, 'W': load_wave, 'WS': load_waves}
    )


def format_asteval_error(aeval: Interpreter) -> str:
    error_msg = aeval.error_msg
    if isinstance(error_msg, str) and error_msg:
        return error_msg
    if error_msg:
        return '\n'.join(error_msg)
    if aeval.error:
        return '\n'.join(str(err) for err in aeval.error)
    return 'Unknown error'


def execute_transform(
    reader: Any, code: str, context: dict[str, Any], data: Any = None
) -> Any:
    if not code.strip():
        return data

    aeval = build_interpreter(reader, data, context)
    aeval(code)
    if aeval.error:
        raise RuntimeError(format_asteval_error(aeval))
    return aeval.symtable.get('data', data)


class AnalysisEngine:
    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        self.reader_class = get_reader_class(file_path)
        self.reader = self.reader_class(file_path)
        self.reader.__enter__()

    def close(self) -> None:
        if self.reader:
            self.reader.__exit__(None, None, None)
            self.reader = None

    def analyze(self, transform_code: str, sample_rate: int = 1) -> dict[str, Any]:
        context: dict[str, Any] = {'timestamps': None}
        processed_data = execute_transform(self.reader, transform_code, context)

        if _is_waveform(processed_data):
            timestamps, values = _process_waveform(processed_data, sample_rate)
            key = getattr(processed_data, 'name', None) or 'value'
            return {'timestamps': timestamps.tolist(), 'values': {key: values.tolist()}}

        if isinstance(processed_data, dict):
            if not processed_data:
                return {'timestamps': [], 'values': {}}
            normalized_rate = max(int(sample_rate or 1), 1)
            first_key = next(iter(processed_data.keys()))
            first_wave = processed_data[first_key]
            if not _is_waveform(first_wave):
                raise RuntimeError('Expected Waveform values in result dict')
            first_timestamps = _to_float_array(first_wave.time)
            timestamps = (
                _downsample_values(first_timestamps, normalized_rate)
                if normalized_rate > 1
                else first_timestamps
            )
            values: dict[str, list[float]] = {}
            for key, wave in processed_data.items():
                if not _is_waveform(wave):
                    raise RuntimeError('Expected Waveform values in result dict')
                wave_timestamps = _to_float_array(wave.time)
                if wave_timestamps.shape[0] != first_timestamps.shape[0]:
                    raise RuntimeError('Waveform timestamps length mismatch')
                if not np.array_equal(wave_timestamps, first_timestamps):
                    raise RuntimeError('Waveform timestamps mismatch')
                wave_values = _to_float_array(wave.value)
                if wave_values.shape[0] != first_timestamps.shape[0]:
                    raise RuntimeError('Waveform values length mismatch')
                if normalized_rate > 1:
                    wave_values = _downsample_values(wave_values, normalized_rate)
                values[key] = wave_values.tolist()
            return {'timestamps': timestamps.tolist(), 'values': values}

        return {'timestamps': [], 'values': {}}


def _to_float_array(values: Any) -> np.ndarray:
    if isinstance(values, np.ndarray):
        return values.astype(float, copy=False)
    return np.asarray(values, dtype=float)


def _is_waveform(value: Any) -> bool:
    return hasattr(value, 'time') and hasattr(value, 'value')


def _process_waveform(wave: Any, sample_rate: int) -> tuple[np.ndarray, np.ndarray]:
    normalized_rate = max(int(sample_rate or 1), 1)
    timestamps = _to_float_array(wave.time)
    values = _to_float_array(wave.value)
    if timestamps.shape[0] != values.shape[0]:
        raise RuntimeError('Waveform timestamps length mismatch')
    if normalized_rate > 1:
        timestamps = _downsample_values(timestamps, normalized_rate)
        values = _downsample_values(values, normalized_rate)
    return timestamps, values


def _downsample_values(data: np.ndarray, rate: int) -> np.ndarray:
    if rate <= 1:
        return data.astype(float, copy=False)
    length = data.shape[0]
    if length == 0:
        return data.astype(float, copy=False)
    trimmed = (length // rate) * rate
    if trimmed > 0:
        head = data[:trimmed].reshape(-1, rate)
        head_mean = np.nanmean(head, axis=1)
    else:
        head_mean = np.empty((0,), dtype=float)
    if trimmed < length:
        tail_mean = np.nanmean(data[trimmed:])
        return np.concatenate([head_mean, np.array([tail_mean], dtype=float)])
    return head_mean
