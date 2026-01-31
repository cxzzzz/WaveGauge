# WaveGauge

WaveGauge 是一个现代化的、基于 Web 的硬件波形分析可视化工具。它允许工程师加载仿真波形（VCD/FSDB）并使用 Python 脚本定义分析指标，为性能洞察提供实时、交互式的图表。

WaveGauge 用“代码即指标（Code-as-Metric）”的灵活性取代了手动波形检查，实现了硬件设计的自动化、可复现和复杂的分析。

![WaveGauge 演示](assets/demo.webp)

## 主要功能

- **多格式支持**：无缝解析 VCD (Value Change Dump) 和 FSDB (Fast Signal DataBase) 波形文件。
- **可脚本化分析**：使用 Python 定义自定义指标，内置支持 `numpy`、`pandas` 和自定义波形操作符（例如用于加载信号的 `W()`）。
- **多样化可视化**：
  - **计数/吞吐量**：用于连续指标（例如总线利用率、缓冲区占用率）的折线图和柱状图。
  - **瞬时事件**：用于离散事件发生（例如缓存未命中、中断）的散点图。
  - **完整时间线**：用于状态机转换、事务生命周期和任务持续时间的甘特图式视图。
- **基线对比**：轻松将当前仿真运行与基线进行比较，以识别回归或性能改进。
- **分组管理**：拖放界面将分析项目组织成层次化组，以获得更好的项目结构。

## 技术栈

- **前端**：Vue 3, TypeScript, Ant Design Vue, Apache ECharts, Tailwind CSS.
- **后端**：Python 3.9+, FastAPI, WaveKit, Asteval .
- **桌面端**：PyWebView (GTK/QT).

## 快速开始

### 前置要求

- **Node.js**：版本 18 或更高。
- **Python**：版本 3.9 或更高。
- **Linux 要求**（用于桌面模式）：
  - GTK3 和 PyGObject 依赖项（例如 `libgtk-3-dev`, `libgirepository1.0-dev`）。

### 安装

克隆仓库并安装前端和后端的依赖项：

```bash
make install
```

### 开发

WaveGauge 支持两种开发模式：

1.  **服务器模式**：
    启动后端服务器。如果进行前端开发，需要单独启动前端开发服务器，否则它提供构建的资源。
    ```bash
    make dev-server
    ```
    访问地址：`http://localhost:8000`。

2.  **桌面模式**：
    使用 PyWebView 在原生窗口中启动应用程序。
    ```bash
    make dev-desktop
    ```

### 构建与打包

使用 `Makefile` 构建产物：

1.  **构建可执行文件（桌面应用）**
    在 `dist/` 中创建一个独立的可执行文件。
    ```bash
    make build-exe
    ```

2.  **构建源码包**
    在 `dist/` 中创建一个版本化的源码分发包。
    ```bash
    make build-source
    ```

## 使用示例

WaveGauge 允许您编写 Python 代码片段将原始波形数据转换为指标。

**示例：计算有效周期百分比**

```python
# 从波形加载 'ready' 信号
# 'clock' 参数指定采样时钟
valid = W('top.ready', clock='top.clk')

# 结果将根据选定的图表类型自动可视化
valid
```

## 许可证

MIT License
