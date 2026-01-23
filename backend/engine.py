from __future__ import annotations

from pathlib import Path
from typing import Any, cast

import numpy as np
import pandas as pd
from asteval import Interpreter
from typing_extensions import TypedDict
from wavekit import Waveform

try:
    from wavekit import FsdbReader, VcdReader
except ImportError:
    from wavekit import VcdReader

    FsdbReader = None


def format_asteval_error(aeval: Interpreter) -> str:
    error_msg = aeval.error_msg
    if isinstance(error_msg, str) and error_msg:
        return error_msg
    if error_msg:
        return "\n".join(error_msg)
    if aeval.error:
        return "\n".join(str(err) for err in aeval.error)
    return "Unknown error"


class CounterSeries(TypedDict):
    timestamps: list[float | int]
    values: list[float | int]


class CounterAnalysisResult(TypedDict):
    series: dict[str, CounterSeries]
    is_multiseries: bool


class InstantSeries(TypedDict):
    timestamps: list[int]
    values: list[str | float | int]


class InstantAnalysisResult(TypedDict):
    series: dict[str, InstantSeries]
    is_multiseries: bool


class CompleteSeries(TypedDict):
    timestamps: list[int]
    values: list[str | float | int]
    durations: list[int]


class CompleteAnalysisResult(TypedDict):
    series: dict[str, CompleteSeries]
    is_multiseries: bool


class AnalysisEngine:
    def load_wave(self, path: str, clock: str | None = None) -> Any:
        return self.reader.load_wave(path, clock=clock)

    def load_matched_waves(self, pattern: Any, clock: str | None = None, **kwargs: Any) -> Any:
        return self.reader.load_waves(pattern, clock=clock, **kwargs)

    def execute_transform(self, code: str) -> Any:
        aeval = Interpreter(
            usersyms={"pd": pd, "np": np, "W": self.load_wave, "MW": self.load_matched_waves}
        )
        result = aeval(code)
        if aeval.error:
            raise RuntimeError(format_asteval_error(aeval))
        return result

    @staticmethod
    def get_reader_class(file_path: str) -> type[Any]:
        suffix = Path(file_path).suffix.lower()
        if suffix == ".vcd":
            return cast(type[Any], VcdReader)
        if suffix == ".fsdb":
            if FsdbReader is None:
                raise ValueError("FsdbReader is not available in current wavekit build")
            return cast(type[Any], FsdbReader)
        raise ValueError(f"Unsupported waveform file type: {suffix or 'unknown'}")

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        self.reader_class = self.get_reader_class(file_path)
        self.reader = self.reader_class(file_path)
        self.reader.__enter__()

    def close(self) -> None:
        if self.reader:
            self.reader.__exit__(None, None, None)
            self.reader = None

    def analyze_counter(self, transform_code: str, sample_rate: int = 1) -> CounterAnalysisResult:
        # CounterTransformResult = Waveform | dict[str, Waveform]
        data = self.execute_transform(transform_code)
        if isinstance(data, Waveform):
            data = {"": data}
            is_multivalue = False
        elif isinstance(data, dict):
            is_multivalue = True
        else:
            raise ValueError(f"Unexpected transform result type: {type(data)}")

        series: dict[str, CounterSeries] = {}
        for key, value in data.items():
            assert isinstance(value, Waveform), (
                f"Unexpected value type for key {key}: {type(value)}"
            )
            sampled_wave = value.sample(sample_rate, func=np.mean)
            series[key] = {
                "timestamps": sampled_wave.time.tolist(),
                "values": sampled_wave.value.tolist(),
            }

        return {
            "series": series,
            "is_multiseries": is_multivalue,
        }

    def analyze_instant(self, transform_code: str) -> InstantAnalysisResult:
        # InstantTransformResult = Waveform | dict[str, Waveform]
        data = self.execute_transform(transform_code)
        if isinstance(data, Waveform):
            data = {"": data}
            is_multivalue = False
        elif isinstance(data, dict):
            is_multivalue = True
        else:
            raise ValueError(f"Unexpected transform result type: {type(data)}")

        series: dict[str, InstantSeries] = {}
        for key, value in data.items():
            assert isinstance(value, Waveform), (
                f"Unexpected value type for key {key}: {type(value)}"
            )
            events = value.filter(lambda x: x != 0)
            series[key] = InstantSeries(
                timestamps=events.time.tolist(), values=events.map(lambda x: 0).value.tolist()
            )

        return InstantAnalysisResult(
            series=series,
            is_multiseries=is_multivalue,
        )

    def analyze_complete(self, transform_code: str) -> CompleteAnalysisResult:
        # CompleteTransformResult = Waveform | dict[str, Waveform]
        data = self.execute_transform(transform_code)
        if isinstance(data, Waveform):
            data = {"": data}
            is_multivalue = False
        elif isinstance(data, dict):
            is_multivalue = True
        else:
            raise ValueError(f"Unexpected transform result type: {type(data)}")

        series: dict[str, CompleteSeries] = {}
        for key, value in data.items():
            assert isinstance(value, Waveform), (
                f"Unexpected value type for key {key}: {type(value)}"
            )
            events = value.filter(lambda x: x != 0)
            series[key] = CompleteSeries(
                timestamps=events.time.tolist(),
                values=events.map(lambda x: 0).value.tolist(),
                durations=events.value.tolist(),
            )

        return CompleteAnalysisResult(
            series=series,
            is_multiseries=is_multivalue,
        )
