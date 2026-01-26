# WaveGauge

WaveGauge is a modern, web-based visualization tool for hardware waveform analysis. It enables engineers to load simulation waveforms (VCD/FSDB) and define analysis metrics using Python scripts, providing real-time, interactive charts for performance insights.

WaveGauge replaces manual waveform inspection with "Code-as-Metric" flexibility, allowing for automated, reproducible, and complex analysis of hardware designs.

## Key Features

- **Multi-Format Support**: Seamlessly parse VCD (Value Change Dump) and FSDB (Fast Signal DataBase) waveform files.
- **Scriptable Analysis**: Define custom metrics using Python with built-in support for `numpy`, `pandas`, and custom waveform operators (e.g., `W()` for loading signals).
- **Versatile Visualization**:
  - **Counter/Throughput**: Line and bar charts for continuous metrics (e.g., bus utilization, buffer occupancy).
  - **Instant Events**: Scatter plots for discrete event occurrences (e.g., cache misses, interrupts).
  - **Complete Timeline**: Gantt-like views for state machine transitions, transaction lifecycles, and task durations.
- **Baseline Comparison**: Easily compare current simulation runs against a baseline to identify regressions or performance improvements.
- **Group Management**: Drag-and-drop interface to organize analysis items into hierarchical groups for better project structure.

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Ant Design Vue, Apache ECharts, Tailwind CSS.
- **Backend**: Python 3.9+, FastAPI, WaveKit, Asteval (Sandboxed Eval).

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher.
- **Python**: Version 3.9 or higher.

### Build & Run

WaveGauge uses a `Makefile` to simplify the build and execution process.

1.  **Build the Project**
    This command creates a virtual environment, installs backend dependencies, and builds the frontend assets.
    ```bash
    make build
    ```

2.  **Start the Service**
    This command starts the backend server, which also serves the compiled frontend static files.
    ```bash
    make run
    ```
    Once started, access the application at `http://localhost:8000`.

## Usage Example

WaveGauge allows you to write Python snippets to transform raw waveform data into metrics.

**Example: Calculating Valid Cycles Percentage**

```python
# Load the 'ready' signal from the waveform
# 'clock' argument specifies the sampling clock
valid = W('top.ready', clock='top.clk')

# The result is automatically visualized based on the selected chart type
valid
```

## License

MIT License
