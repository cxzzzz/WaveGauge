import axios from 'axios';
import type * as echarts from 'echarts';
import {
  AnalysisStrategy,
  type AnalysisRunResult,
  type ChartOptionParams,
  type History,
  type RunAnalysisParams
} from './AnalysisStrategy';

type CounterAnalysisPayload = {
  series: Record<string, { timestamps: number[]; values: number[] }>;
  is_multiseries: boolean;
};

export class CounterStrategy extends AnalysisStrategy {
  readonly type = 'counter';
  readonly chartTypeOptions = [
    { label: 'Bar', value: 'bar' },
    { label: 'Stacked Bar', value: 'stacked_bar' },
    { label: 'Line', value: 'line' },
    { label: 'Stacked Line', value: 'stacked_line' },
    { label: 'Heatmap', value: 'heatmap' }
  ];
  readonly summaryTypeOptions = [
    { label: 'Average', value: 'avg' },
    { label: 'Maximum', value: 'max' },
    { label: 'Minimum', value: 'min' },
    { label: 'Sum', value: 'sum' }
  ];

  private parseCounterHistory(payload: CounterAnalysisPayload): AnalysisRunResult {
    const entries = Object.entries(payload.series);
    if (!entries.length) {
      return { history: { timestamps: [], values: {} }, isMultiseries: payload.is_multiseries };
    }
    const firstEntry = entries[0];
    if (!firstEntry) {
      return { history: { timestamps: [], values: {} }, isMultiseries: payload.is_multiseries };
    }
    const [firstKey, firstSeries] = firstEntry;
    const timestamps = firstSeries?.timestamps ?? [];
    const values: Record<string, number[]> = {};
    values[firstKey] = firstSeries.values ?? [];
    entries.slice(1).forEach(([key, series]) => {
      values[key] = series.values ?? [];
    });
    return { history: { timestamps, values }, isMultiseries: payload.is_multiseries };
  }

  async runAnalysis(params: RunAnalysisParams): Promise<AnalysisRunResult> {
    const response = await axios.post(`${params.apiUrl}/analyze/counter`, {
      file_path: params.wavePath,
      transform_code: params.transformCode,
      sample_rate: params.sampleRate
    });

    if (response.data.status !== 'success') {
      throw new Error(String(response.data.error ?? 'Unknown error'));
    }

    return this.parseCounterHistory(response.data.data as CounterAnalysisPayload);
  }

  calculateSummary(history: History, summaryType: string): Record<string, number> {
    const keys = Object.keys(history.values);

    const summarize = (values: number[]): number => {
      const numericValues = values.map(Number).filter(Number.isFinite);
      if (!numericValues.length) return Number.NaN;
      if (summaryType === 'max') return Math.max(...numericValues);
      if (summaryType === 'min') return Math.min(...numericValues);
      if (summaryType === 'sum') return numericValues.reduce((acc, val) => acc + val, 0);
      const total = numericValues.reduce((acc, val) => acc + val, 0);
      return total / numericValues.length;
    };

    return Object.fromEntries(keys.map(key => [key, summarize(history.values[key]!)]));
  }

  buildChartOption(params: ChartOptionParams): echarts.EChartsOption {
    const { history, chartType, zoomRange, userMaxValue, isDark } = params;
    const textColor = isDark ? '#a0a0a0' : '#666';
    const axisColor = isDark ? '#404040' : '#e0e0e0';
    const steps = history.timestamps.map(item => String(item));
    const keys = Object.keys(history.values);
    const gridBottom = '20%';

    const realZoomRange = {
      start: zoomRange.start,
      end: zoomRange.end === Number.MAX_SAFE_INTEGER ? undefined : zoomRange.end
    };
    const dataZoom: echarts.DataZoomComponentOption[] = [
      {
        type: 'inside',
        xAxisIndex: 0,
        start: realZoomRange.start,
        end: realZoomRange.end
      }, {
        type: 'slider',
        xAxisIndex: 0,
        height: '10%',
        bottom: '2%',
        start: realZoomRange.start,
        end: realZoomRange.end
      }
    ];

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        top: '6%',
        bottom: gridBottom,
        left: '6%',
        right: '6%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
        borderColor: isDark ? '#555' : '#eee',
        textStyle: {
          color: textColor
        }
      },
      xAxis: {
        type: 'category',
        data: steps,
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: { color: textColor }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
        max: Number.isFinite(userMaxValue) ? userMaxValue : undefined
      },
      dataZoom,
      series: []
    };

    if (chartType === 'heatmap') {
      const yCategories = keys;
      const heatmapData: Array<[number, number, number]> = [];
      let maxValue = 0;
      yCategories.forEach((key, yIndex) => {
        steps.forEach((_, xIndex) => {
          const rawValue = Number(history.values[key]![xIndex]);
          const value = Number.isFinite(rawValue) ? rawValue : 0;
          maxValue = Math.max(maxValue, value);
          heatmapData.push([xIndex, yIndex, value]);
        });
      });
      option.xAxis = {
        type: 'category',
        data: steps,
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: { color: textColor }
      };
      option.yAxis = {
        type: 'category',
        data: yCategories,
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: { color: textColor }
      };
      const effectiveMax = Number.isFinite(userMaxValue) ? Number(userMaxValue) : maxValue;
      option.visualMap = {
        min: 0,
        max: Math.max(1, effectiveMax),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 0,
        textStyle: { color: textColor }
      };
      option.series = [
        {
          type: 'heatmap',
          data: heatmapData,
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } }
        }
      ] as echarts.SeriesOption[];
    } else {
      const isStacked = chartType === 'stacked_bar' || chartType === 'stacked_line';
      const seriesType = chartType.includes('bar') ? 'bar' : 'line';
      const series = keys.map(key => {
        const data = steps.map((_, index) => history.values[key]![index]);
        if (seriesType === 'line') {
          const lineItem: echarts.LineSeriesOption = {
            name: key,
            data,
            type: 'line',
            smooth: true,
            showSymbol: false,
            areaStyle: { opacity: 0.1 }
          };
          if (isStacked) {
            lineItem.stack = 'total';
          }
          return lineItem;
        }
        const barItem: echarts.BarSeriesOption = {
          name: key,
          data,
          type: 'bar'
        };
        if (isStacked) {
          barItem.stack = 'total';
        }
        return barItem;
      });
      option.series = series as echarts.SeriesOption[];
    }
    return option;
  }
}
