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

    def analyze(self, transform_code: str) -> dict[str, Any]:
        context: dict[str, Any] = {'timestamps': None}
        processed_data = execute_transform(self.reader, transform_code, context)

        if isinstance(processed_data, pd.DataFrame):
            timestamps = context.get('timestamps')
            if timestamps is None:
                raise RuntimeError('Waveform timestamps are required but missing')
            if len(timestamps) != len(processed_data):
                raise RuntimeError('Waveform timestamps length mismatch')
            timestamp_list = timestamps.tolist()
            values: dict[str, list[Any]] = {}
            for column in processed_data.columns:
                series = processed_data[column]
                values[column] = [
                    value.item() if isinstance(value, np.generic) else value
                    for value in series.to_list()
                ]
            return {'timestamps': timestamp_list, 'values': values}

        return {'timestamps': [], 'values': {}}
