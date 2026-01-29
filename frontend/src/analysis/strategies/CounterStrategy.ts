import axios from 'axios';
import type * as echarts from 'echarts';
import {
  AnalysisStrategy,
  type AnalysisRunResult,
  type ChartOptionParams,
  type DisplayMaxParams,
  type RunAnalysisParams,
  type SummaryParams
} from './AnalysisStrategy';
import { dmean, dmax, dmin } from '@stdlib/stats/base';
import dsum from '@stdlib/blas/ext/base/dsum';

export type CounterData = {
  series: Record<string, { timestamps: Float64Array; values: Float64Array }>;
  is_multiseries: boolean;
};

export class CounterStrategy extends AnalysisStrategy<CounterData> {
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

  getEmptyData(): CounterData {
    return { series: {}, is_multiseries: false };
  }

  private getVisibleData(data: CounterData, zoomRange: { start: number; end: number }) {
    const entries = Object.entries(data.series);
    if (!entries.length) {
      return { timestamps: new Float64Array(0), values: {} as Record<string, Float64Array> };
    }
    const firstEntry = entries[0];
    if (!firstEntry) {
      return { timestamps: new Float64Array(0), values: {} as Record<string, Float64Array> };
    }
    const [, firstSeries] = firstEntry;
    const timestamps = firstSeries.timestamps;
    const length = timestamps.length;
    if (!length) {
      return { timestamps: new Float64Array(0), values: {} as Record<string, Float64Array> };
    }
    const startIndex = Math.max(
      0,
      Math.min(length - 1, Math.floor((zoomRange.start / 100) * (length - 1)))
    );
    const endIndex = Math.max(
      startIndex,
      Math.min(length - 1, Math.ceil((zoomRange.end / 100) * (length - 1)))
    );
    
    // Use subarray for zero-copy view
    const slicedTimestamps = timestamps.subarray(startIndex, endIndex + 1);
    const values: Record<string, Float64Array> = {};
    entries.forEach(([key, series]) => {
      values[key] = series.values.subarray(startIndex, endIndex + 1);
    });
    return { timestamps: slicedTimestamps, values };
  }

  async runAnalysis(params: RunAnalysisParams): Promise<AnalysisRunResult<CounterData>> {
    const response = await axios.post(`${params.apiUrl}/analyze/counter`, {
      file_path: params.wavePath,
      transform_code: params.transformCode,
      sample_rate: params.sampleRate
    });

    if (response.data.status !== 'success') {
      throw new Error(String(response.data.error ?? 'Unknown error'));
    }

    const payload = response.data.data;
    const processedData: CounterData = {
      is_multiseries: payload.is_multiseries,
      series: {}
    };

    for (const key in payload.series) {
      processedData.series[key] = {
        timestamps: new Float64Array(payload.series[key].timestamps),
        values: new Float64Array(payload.series[key].values)
      };
    }

    return { data: processedData, isMultiseries: processedData.is_multiseries };
  }

  calculateSummary(params: SummaryParams<CounterData>): Record<string, number> {
    const { data, summaryType, zoomRange } = params;
    const visible = this.getVisibleData(data, zoomRange);
    const keys = Object.keys(visible.values);

    const summarize = (values: Float64Array): number => {
      const N = values.length;
      if (N === 0) return Number.NaN;
      
      // @stdlib/stats/base functions take (N, x, stride)
      if (summaryType === 'max') return dmax(N, values, 1);
      if (summaryType === 'min') return dmin(N, values, 1);
      if (summaryType === 'sum') return dsum(N, values, 1);
      return dmean(N, values, 1);
    };

    return Object.fromEntries(keys.map(key => [key, summarize(visible.values[key] || new Float64Array(0))]));
  }

  getDisplayMaxValues(params: DisplayMaxParams<CounterData>): Record<string, number> {
    const { data, userMaxValue, zoomRange } = params;
    const visible = this.getVisibleData(data, zoomRange);
    const keys = Object.keys(visible.values);
    if (Number.isFinite(userMaxValue)) {
      return Object.fromEntries(keys.map(key => [key, Number(userMaxValue)]));
    }
    return Object.fromEntries(
      keys.map((key) => {
        const values = visible.values[key] ?? [];
        let maxVal = 0;
        values.forEach((item) => {
          const value = Number(item);
          if (Number.isFinite(value) && value > maxVal) {
            maxVal = value;
          }
        });
        return [key, maxVal];
      })
    );
  }

  buildChartOption(params: ChartOptionParams<CounterData>): echarts.EChartsOption {
    const { data, chartType, zoomRange, userMaxValue, isDark } = params;
    const visible = this.getVisibleData(data, zoomRange);
    const textColor = isDark ? '#a0a0a0' : '#666';
    const axisColor = isDark ? '#404040' : '#e0e0e0';
    const steps = Array.from(visible.timestamps, String);
    const keys = Object.keys(visible.values);
    const gridBottom = '20%';

    const dataZoom: echarts.DataZoomComponentOption[] = [
      {
        type: 'inside',
        xAxisIndex: 0,
        start: zoomRange.start,
        end: zoomRange.end
      }, {
        type: 'slider',
        xAxisIndex: 0,
        height: '10%',
        bottom: '2%',
        start: zoomRange.start,
        end: zoomRange.end
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
          const rawValue = Number(visible.values[key]![xIndex]);
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
        const dataPoints = steps.map((_, index) => Number(visible.values[key]![index]));
        if (seriesType === 'line') {
          const lineItem: echarts.LineSeriesOption = {
            name: key,
            data: dataPoints,
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
          data: dataPoints,
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
