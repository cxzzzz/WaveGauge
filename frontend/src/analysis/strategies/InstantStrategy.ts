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

export type InstantData = {
  series: Record<string, { timestamps: Float64Array; values: Array<number | string> }>;
  timeRange: [number, number];
  is_multiseries: boolean;
};

export class InstantStrategy extends AnalysisStrategy<InstantData> {
  readonly type = 'instant';
  readonly chartTypeOptions = [{ label: 'Scatter', value: 'scatter' }];
  readonly summaryTypeOptions = [
    { label: 'Event Count', value: 'count' },
    { label: 'Average Interval', value: 'avg_interval' }
  ];

  getEmptyData(): InstantData {
    return { series: {}, timeRange: [0, 0], is_multiseries: false };
  }

  private getVisibleSeries(data: InstantData, zoomRange: { start: number; end: number }) {
    const seriesEntries = Object.entries(data.series);
    if (!seriesEntries.length) {
      return { series: {} as InstantData['series'], window: null as null | [number, number] };
    }

    const [globalStart, globalEnd] = data.timeRange;
    const globalDuration = globalEnd - globalStart;
    
    // If single point or duration 0, handle gracefully
    if (globalDuration <= 0) {
         // Return all data (or just the single point)
         // If duration is 0, start == end.
         // visibleStart/End will be same as globalStart/End
    }

    // Calculate visible time window based on global time range
    const visibleStart = globalStart + (zoomRange.start / 100) * globalDuration;
    const visibleEnd = globalStart + (zoomRange.end / 100) * globalDuration;

    const filteredSeries: InstantData['series'] = {};
    seriesEntries.forEach(([key, series]) => {
      // Use binary search to find range in sorted series timestamps
      const startIdx = this.findStartIndex(series.timestamps, visibleStart);
      const endIdx = this.findEndIndex(series.timestamps, visibleEnd);
      
      if (startIdx > endIdx) {
          filteredSeries[key] = { timestamps: new Float64Array(0), values: [] };
          return;
      }
      
      const timestamps = series.timestamps.subarray(startIdx, endIdx + 1);
      // values is a standard array, so we use slice
      const values = series.values.slice(startIdx, endIdx + 1);
      
      filteredSeries[key] = { timestamps, values };
    });
    return { series: filteredSeries, window: [visibleStart, visibleEnd] as [number, number] };
  }

  async runAnalysis(params: RunAnalysisParams): Promise<AnalysisRunResult<InstantData>> {
    const response = await axios.post(`${params.apiUrl}/analyze/instant`, {
      file_path: params.wavePath,
      transform_code: params.transformCode
    });
    if (response.data.status !== 'success') {
      throw new Error(String(response.data.error ?? 'Unknown error'));
    }
    
    const payload = response.data.data;
    const processedData: InstantData = {
        is_multiseries: payload.is_multiseries,
        timeRange: payload.time_range ? [payload.time_range[0], payload.time_range[1]] : [0, 0],
        series: {}
    };
    
    for (const key in payload.series) {
        processedData.series[key] = {
            timestamps: new Float64Array(payload.series[key].timestamps),
            values: payload.series[key].values // Keep as is
        };
    }
    
    return { data: processedData, isMultiseries: processedData.is_multiseries };
  }

  calculateSummary(params: SummaryParams<InstantData>): Record<string, number> {
    const { data, summaryType, zoomRange } = params;
    const visible = this.getVisibleSeries(data, zoomRange);
    const keys = Object.keys(visible.series);
    const isEventValue = (value: number | string) => {
      if (typeof value === 'string') return value.length > 0;
      return Number.isFinite(Number(value));
    };

    if (summaryType === 'count') {
      return Object.fromEntries(
        keys.map(key => [
          key,
          (visible.series[key]?.timestamps ?? []).filter((_, index) =>
            isEventValue(visible.series[key]!.values[index]!)
          ).length
        ])
      );
    }

    if (summaryType === 'avg_interval') {
      return Object.fromEntries(
        keys.map(key => {
          const series = visible.series[key];
          if (!series) return [key, Number.NaN];
          const eventTimestamps = series.timestamps.filter((_, index) =>
            isEventValue(series.values[index]!)
          );
          if (eventTimestamps.length < 2) {
            return [key, Number.NaN];
          }
          let total = 0;
          for (let index = 1; index < eventTimestamps.length; index += 1) {
            total += eventTimestamps[index]! - eventTimestamps[index - 1]!;
          }
          return [key, total / (eventTimestamps.length - 1)];
        })
      );
    }

    return Object.fromEntries(keys.map(key => [key, Number.NaN]));
  }

  getDisplayMaxValues(params: DisplayMaxParams<InstantData>): Record<string, number> {
    const { summaryValues, userMaxValue } = params;
    const keys = Object.keys(summaryValues);
    if (Number.isFinite(userMaxValue)) {
      return Object.fromEntries(keys.map(key => [key, Number(userMaxValue)]));
    }
    return Object.fromEntries(keys.map(key => [key, Number(summaryValues[key] ?? 0)]));
  }

  buildChartOption(params: ChartOptionParams<InstantData>): echarts.EChartsOption {
    const { data, zoomRange, isDark } = params;
    const visible = this.getVisibleSeries(data, zoomRange);
    const textColor = isDark ? '#a0a0a0' : '#666';
    const axisColor = isDark ? '#404040' : '#e0e0e0';
    const keys = Object.keys(visible.series);

    const dataZoom: echarts.DataZoomComponentOption[] = [
      {
        type: 'inside',
        xAxisIndex: 0,
        start: zoomRange.start,
        end: zoomRange.end 
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: '10%',
        bottom: '2%',
        start: zoomRange.start,
        end: zoomRange.end === Number.MAX_SAFE_INTEGER ? undefined : zoomRange.end,
        showDataShadow: false // Optimization: disable data shadow
      }
    ];

    const series: echarts.SeriesOption[] = [];
    const isEventValue = (value: number | string) => {
      if (typeof value === 'string') return value.length > 0;
      return Number.isFinite(Number(value));
    };

    keys.forEach((key) => {
      const grouped = new Map<string, Array<[number, string]>>();
      const seriesData = visible.series[key];
      if (!seriesData) return;
      seriesData.values.forEach((value, index) => {
        if (!isEventValue(value)) return;
        const timestamp = seriesData.timestamps[index]!;
        const label = String(value);
        const bucket = grouped.get(label) ?? [];
        bucket.push([timestamp, key]);
        grouped.set(label, bucket);
      });

      grouped.forEach((data, label) => {
        series.push({
          type: 'scatter',
          name: `${key}: ${label}`,
          data,
          symbolSize: 8,
          large: true, // Optimization: large mode
          largeThreshold: 2000 // Optimization: threshold for large mode
        });
      });
    });

    return {
      backgroundColor: 'transparent',
      animation: false, // Optimization: disable animation
      grid: {
        top: '6%',
        bottom: '18%',
        left: '6%',
        right: '6%',
        containLabel: true
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
        borderColor: isDark ? '#555' : '#eee',
        textStyle: { color: textColor },
        formatter: (params: any) => {
          const value = params.value as [number, string];
          return `${params.seriesName}<br/>t=${value[0]}`;
        }
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: { color: textColor }
      },
      yAxis: {
        type: 'category',
        data: keys,
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: { color: textColor },
        splitLine: {
          show: true,
          lineStyle: { color: isDark ? '#333' : '#eee' }
        }
      },
      series,
      dataZoom
    };
  }
}
