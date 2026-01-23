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
  series: Record<string, { timestamps: number[]; values: Array<number | string> }>;
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
    return { series: {}, is_multiseries: false };
  }

  private getVisibleSeries(data: InstantData, zoomRange: { start: number; end: number }) {
    const seriesEntries = Object.entries(data.series);
    if (!seriesEntries.length) {
      return { series: {} as InstantData['series'], window: null as null | [number, number] };
    }
    const timestampSet = new Set<number>();
    seriesEntries.forEach(([, series]) => {
      series.timestamps.forEach((timestamp) => {
        const numeric = Number(timestamp);
        if (Number.isFinite(numeric)) {
          timestampSet.add(numeric);
        }
      });
    });
    const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b);
    if (!allTimestamps.length) {
      return { series: {} as InstantData['series'], window: null as null | [number, number] };
    }
    const length = allTimestamps.length;
    const startIndex = Math.max(
      0,
      Math.min(length - 1, Math.floor((zoomRange.start / 100) * (length - 1)))
    );
    const endIndex = Math.max(
      startIndex,
      Math.min(length - 1, Math.ceil((zoomRange.end / 100) * (length - 1)))
    );
    const windowStart = allTimestamps[startIndex]!;
    const windowEnd = allTimestamps[endIndex]!;

    const filteredSeries: InstantData['series'] = {};
    seriesEntries.forEach(([key, series]) => {
      const timestamps: number[] = [];
      const values: Array<number | string> = [];
      series.timestamps.forEach((timestamp, index) => {
        const numeric = Number(timestamp);
        if (!Number.isFinite(numeric)) return;
        if (numeric < windowStart || numeric > windowEnd) return;
        timestamps.push(numeric);
        values.push(series.values[index] ?? Number.NaN);
      });
      filteredSeries[key] = { timestamps, values };
    });
    return { series: filteredSeries, window: [windowStart, windowEnd] as [number, number] };
  }

  async runAnalysis(params: RunAnalysisParams): Promise<AnalysisRunResult<InstantData>> {
    const response = await axios.post(`${params.apiUrl}/analyze/instant`, {
      file_path: params.wavePath,
      transform_code: params.transformCode
    });
    if (response.data.status !== 'success') {
      throw new Error(String(response.data.error ?? 'Unknown error'));
    }
    const payload = response.data.data as InstantData;
    return { data: payload, isMultiseries: payload.is_multiseries };
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
        end: zoomRange.end === Number.MAX_SAFE_INTEGER ? undefined : zoomRange.end
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: '10%',
        bottom: '2%',
        start: zoomRange.start,
        end: zoomRange.end === Number.MAX_SAFE_INTEGER ? undefined : zoomRange.end
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
          symbolSize: 8
        });
      });
    });

    return {
      backgroundColor: 'transparent',
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
