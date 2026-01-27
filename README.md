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
- **Cross-Platform Support**:
  - **Server Mode**: Run as a web server for remote access and team collaboration.
  - **Desktop Mode**: Run as a standalone desktop application (Windows/Linux) using PyWebView.

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Ant Design Vue, Apache ECharts, Tailwind CSS.
- **Backend**: Python 3.9+, FastAPI, WaveKit, Asteval (Sandboxed Eval).
- **Desktop**: PyWebView (GTK/QT).

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher.
- **Python**: Version 3.9 or higher.
- **Linux Requirements** (for Desktop mode):
  - GTK3 and PyGObject dependencies (e.g., `libgtk-3-dev`, `libgirepository1.0-dev`).

### Installation

Clone the repository and install dependencies for both frontend and backend:

```bash
make install
```

### Development

WaveGauge supports two development modes:

1.  **Server Mode**:
    Starts the backend server. The frontend dev server needs to be started separately if doing frontend development, or it serves built assets.
    ```bash
    make dev-server
    ```
    Access at `http://localhost:8000`.

2.  **Desktop Mode**:
    Starts the application in a native window using PyWebView.
    ```bash
    make dev-desktop
    ```

### Build & Package

Use the `Makefile` to build artifacts:

1.  **Build Executable (Desktop App)**
    Creates a standalone executable in `dist/`.
    ```bash
    make build-exe
    ```

2.  **Build Source Package**
    Creates a versioned source distribution in `dist/`.
    ```bash
    make build-source
    ```

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
