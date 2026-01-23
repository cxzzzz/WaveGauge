from __future__ import annotations

from pathlib import Path
import sys
import traceback
import functools
import types
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


def log_exceptions(func):
    """Decorator to log full traceback of exceptions before they are caught by asteval."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            # Capture full traceback and attach it to the exception
            tb_str = "".join(traceback.format_exception(type(e), e, e.__traceback__))
            print(f"Exception in {func.__name__}:", file=sys.stderr)
            print(tb_str, file=sys.stderr)
            setattr(e, "_saved_traceback", tb_str)
            raise e

    return wrapper


class LoggedModule:
    """Proxy for a module that wraps all callable attributes with log_exceptions."""

    def __init__(self, module: Any):
        self._module = module

    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._module, name)
        if isinstance(attr, types.ModuleType):
            return LoggedModule(attr)
        if callable(attr) and not isinstance(attr, type):
            return log_exceptions(attr)
        return attr

    def __dir__(self):
        return dir(self._module)

    def __repr__(self):
        return repr(self._module)


def format_asteval_error(aeval: Interpreter) -> str:
    parts: list[str] = []

    # If we have specific errors, prioritize processing them to extract clean tracebacks
    if aeval.error:
        for err in aeval.error:
            saved_tb = None
            
            # Try to find saved traceback in exc_info (most reliable)
            if hasattr(err, "exc_info") and err.exc_info:
                exc_obj = err.exc_info[1]
                if isinstance(exc_obj, Exception):
                    saved_tb = getattr(exc_obj, "_saved_traceback", None)
                    if not saved_tb and hasattr(exc_obj, "__cause__"):
                         saved_tb = getattr(exc_obj.__cause__, "_saved_traceback", None)
            
            # Fallback to checking err.exc directly
            if not saved_tb:
                holder_exc = getattr(err, "exc", None)
                if isinstance(holder_exc, Exception):
                    saved_tb = getattr(holder_exc, "_saved_traceback", None)
                    if not saved_tb and hasattr(holder_exc, "__cause__"):
                         saved_tb = getattr(holder_exc.__cause__, "_saved_traceback", None)

            if saved_tb:
                # Found a clean, full traceback captured by log_exceptions. Use ONLY this.
                parts.append(str(saved_tb).strip())
            else:
                # No saved traceback found (e.g. syntax error, or error in undeclarated function).
                # Use asteval's error formatting which includes line numbers in the script.
                detail = None
                get_error = getattr(err, "get_error", None)
                if callable(get_error):
                    try:
                        detail = get_error()
                    except Exception:
                        detail = None
                
                if detail:
                    # detail is usually a tuple (name, msg) or string. 
                    # If tuple, the second element is the message.
                    if isinstance(detail, tuple) and len(detail) > 1:
                        parts.append(str(detail[1]))
                    else:
                        parts.append(str(detail))
                else:
                    parts.append(f"{type(err).__name__}: {err}")

    # Only fall back to generic error_msg if we found nothing specific
    if not parts:
        error_msg = aeval.error_msg
        if isinstance(error_msg, str) and error_msg:
            parts.append(error_msg)
        elif error_msg:
            parts.extend(str(item) for item in error_msg)

    return "\n\n".join(parts) or "Unknown asteval error"


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
    # 为 W 和 MW 加上显式装饰
    @log_exceptions
    def load_wave(self, path: str, clock: str | None = None) -> Any:
        return self.reader.load_wave(path, clock=clock)

    @log_exceptions
    def load_matched_waves(self, pattern: Any, clock: str | None = None, **kwargs: Any) -> Any:
        return self.reader.load_waves(pattern, clock=clock, **kwargs)

    def execute_transform(self, code: str) -> Any:
        aeval = Interpreter(
            usersyms={
                # 使用 LoggedModule 全局代理 np 和 pd
                "pd": LoggedModule(pd),
                "np": LoggedModule(np),
                "W": self.load_wave,
                "MW": self.load_matched_waves,
            }
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
                timestamps=events.time.tolist(), values=events.map(lambda x: x-x).value.tolist()
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


def log_exceptions(func):
    """Decorator to log full traceback of exceptions before they are caught by asteval."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(f"Exception in {func.__name__}:", file=sys.stderr)
            traceback.print_exc()
            raise e
    return wrapper

class LoggedModule:
    """Proxy for a module that wraps all callable attributes with log_exceptions."""
    def __init__(self, module: Any):
        self._module = module

    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._module, name)
        # 递归处理子模块 (e.g. np.random)
        if isinstance(attr, types.ModuleType):
            return LoggedModule(attr)
        # 自动包装普通函数 (e.g. np.array)
        if callable(attr) and not isinstance(attr, type):
            return log_exceptions(attr)
        return attr
    
    def __dir__(self):
        return dir(self._module)
    
    def __repr__(self):
        return repr(self._module)