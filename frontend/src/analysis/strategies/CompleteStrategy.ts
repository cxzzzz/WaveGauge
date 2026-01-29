import * as echarts from 'echarts';
import {
  AnalysisStrategy,
  type AnalysisRunResult,
  type ChartOptionParams,
  type DisplayMaxParams,
  type RunAnalysisParams,
  type SummaryParams
} from './AnalysisStrategy';
import dsum from '@stdlib/blas/ext/base/dsum';

export type CompleteData = {
  series: Record<string, { timestamps: Float64Array; values: Array<number | string>; durations: Float64Array }>;
  timeRange: [number, number];
  is_multiseries: boolean;
};

// Default palette for states/values
const PALETTE = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
];

export class CompleteStrategy extends AnalysisStrategy<CompleteData> {
  readonly type = 'complete';
  readonly chartTypeOptions = [
    { label: 'Timeline', value: 'timeline' }
  ];
  readonly summaryTypeOptions = [
    { label: 'Count', value: 'count' },
    { label: 'Average Duration', value: 'avg_duration' }
  ];

  getEmptyData(): CompleteData {
    return { series: {}, timeRange: [0, 0], is_multiseries: false };
  }

  async runAnalysis(params: RunAnalysisParams): Promise<AnalysisRunResult<CompleteData>> {
    const { wavePath, transformCode } = params;
    const response = await fetch('/api/analyze/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: wavePath, transform_code: transformCode })
    });
    
    if (!response.ok) {
       const errorText = await response.text();
       let errorMsg = errorText;
       try {
           const json = JSON.parse(errorText);
           if (json.detail) errorMsg = json.detail;
       } catch {}
       throw new Error(errorMsg);
    }
    
    const result = await response.json();
    
    // Convert arrays to Float64Array
    const processedData: CompleteData = {
        is_multiseries: result.data.is_multiseries,
        timeRange: result.data.time_range ? [result.data.time_range[0], result.data.time_range[1]] : [0, 0],
        series: {}
    };
    
    for (const key in result.data.series) {
        const series = result.data.series[key];
        processedData.series[key] = {
            timestamps: new Float64Array(series.timestamps),
            durations: new Float64Array(series.durations),
            values: series.values // Keep mixed/string array as is
        };
    }
    
    return { 
      data: processedData, 
      isMultiseries: result.data.is_multiseries 
    };
  }

  private getVisibleSeries(data: CompleteData, zoomRange: { start: number; end: number }) {
    const visible: Record<string, { 
      timestamps: Float64Array; 
      durations: Float64Array; 
      count: number 
    }> = {};

    // Calculate visible time window based on global time range
    const [globalStart, globalEnd] = data.timeRange;
    const globalDuration = globalEnd - globalStart;
    const visibleStart = globalStart + (zoomRange.start / 100) * globalDuration;
    const visibleEnd = globalStart + (zoomRange.end / 100) * globalDuration;

    for (const [key, series] of Object.entries(data.series)) {
      const { timestamps, durations } = series;
      const len = timestamps.length;
      if (len === 0) {
        visible[key] = { timestamps: new Float64Array(0), durations: new Float64Array(0), count: 0 };
        continue;
      }

      // Calculate end times: endTimes = timestamps + durations
      // Use a simple loop which is faster than daxpy
      const endTimes = new Float64Array(len);
      for (let i = 0; i < len; i++) {
        endTimes[i] = timestamps[i]! + durations[i]!;
      }

      // Find range:
      // startIdx: first index where timestamps[i] >= visibleStart
      // endIdx: last index where endTimes[i] <= visibleEnd
      const startIdx = this.findStartIndex(timestamps, visibleStart);
      const endIdx = this.findEndIndex(endTimes, visibleEnd);

      if (startIdx > endIdx) {
        visible[key] = { timestamps: new Float64Array(0), durations: new Float64Array(0), count: 0 };
        continue;
      }

      // Slice the data
      visible[key] = {
        timestamps: timestamps.subarray(startIdx, endIdx + 1),
        durations: durations.subarray(startIdx, endIdx + 1),
        count: endIdx - startIdx + 1
      };
    }

    return visible;
  }

  calculateSummary(params: SummaryParams<CompleteData>): Record<string, number> {
    const { data, summaryType, zoomRange } = params;
    const visibleSeries = this.getVisibleSeries(data, zoomRange);
    const result: Record<string, number> = {};

    for (const [key, series] of Object.entries(visibleSeries)) {
      if (series.count === 0) {
        result[key] = summaryType === 'count' ? 0 : Number.NaN; // Assuming 0 for count, NaN for avg if empty? 
        // Original logic: if timestamps.length === 0 -> NaN. 
        // If sliced is empty -> count=0. 
        // Let's match original logic closer:
        // Original logic: if (timestamps.length === 0) result[key] = NaN; continue;
        // Then inside loop if no overlap count=0.
        // So if original series was empty, getVisibleSeries returns empty.
        // If original series was NOT empty but no overlap, getVisibleSeries returns empty.
        // To be precise: if count is 0, then result is 0 for count, 0 for avg (original code: count > 0 ? sum/count : 0).
        if (summaryType === 'count') result[key] = 0;
        else if (summaryType === 'avg_duration') result[key] = 0;
        continue;
      }

      if (summaryType === 'count') {
        result[key] = series.count;
      } else if (summaryType === 'avg_duration') {
        // Calculate sum of durations in the range
        // We use dsum on the subarray of durations
        const durationSum = dsum(series.count, series.durations, 1);
        result[key] = series.count > 0 ? durationSum / series.count : 0;
      }
    }

    return result;
  }

  getDisplayMaxValues(_params: DisplayMaxParams<CompleteData>): Record<string, number> {
    // Not typically used for timeline charts, returning empty or placeholders
    return {}; 
  }

  buildChartOption(params: ChartOptionParams<CompleteData>): echarts.EChartsOption {
    const { data, isDark, zoomRange } = params;
    const seriesKeys = Object.keys(data.series);
    if (seriesKeys.length === 0) return {};

    const chartData: any[] = [];
    const categories = seriesKeys;
    const [min, max] = data.timeRange;
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
        end: zoomRange.end,
        showDataShadow: false // Optimization: disable data shadow
      }
    ];
    
    // Collect all unique values to assign consistent colors across series
    const uniqueValues = new Set<string | number>();
    
    seriesKeys.forEach((key, index) => {
      const series = data.series[key];
      if (!series) return;

      for (let i = 0; i < series.timestamps.length; i++) {
        const start = series.timestamps[i];
        if (start === undefined) {
          continue;
        }
        const duration = series.durations[i] ?? 0;
        const val = series.values[i];
        if (val !== undefined) {
          uniqueValues.add(val);
        }

        chartData.push({
          value: [
            index,
            start,
            start + duration,
            duration,
            val
          ]
        });
      }
    });

    // Create color map
    const uniqueValueArray = Array.from(uniqueValues).sort();
    const valueColorMap = new Map();
    uniqueValueArray.forEach((v, i) => {
        valueColorMap.set(v, PALETTE[i % PALETTE.length]);
    });

    // Assign colors to data items
    chartData.forEach(item => {
        item.itemStyle = {
            color: valueColorMap.get(item.value[4])
        };
    });

    function renderItem(params: any, api: any) {
      const categoryIndex = api.value(0);
      const start = api.coord([api.value(1), categoryIndex]);
      const end = api.coord([api.value(2), categoryIndex]);
      
      // Calculate height (0.6 of the category bandwidth)
      // api.size([0, 1])[1] gives the height of one category band
      const height = api.size([0, 1])[1] * 0.6;
      
      const rectShape = echarts.graphic.clipRectByRect({
        x: start[0],
        y: start[1] - height / 2,
        width: end[0] - start[0],
        height: height
      }, {
        x: params.coordSys.x,
        y: params.coordSys.y,
        width: params.coordSys.width,
        height: params.coordSys.height
      });
      
      return rectShape && {
        type: 'rect',
        transition: ['shape'],
        shape: rectShape,
        style: api.style()
      };
    }

    return {
      animation: false, // Optimization: disable animation
      tooltip: {
        formatter: (params: any) => {
          const val = params.value;
          const category = categories[val[0]];
          const startTime = val[1];
          const endTime = val[2];
          const duration = val[3];
          const state = val[4];
          
          return `
            <div style="font-size: 12px;">
              <b>${category}</b><br/>
              State: <b>${state}</b><br/>
              Start: ${startTime}<br/>
              End: ${endTime}<br/>
              Duration: ${duration}
            </div>
          `;
        }
      },
      grid: {
        left: 20,
        right: 20,
        top: 20,
        bottom: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        min,
        max,
        scale: true,
        axisLabel: {
            color: isDark ? '#ccc' : '#333'
        },
        splitLine: {
            show: true,
            lineStyle: { color: isDark ? '#333' : '#eee' }
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
            color: isDark ? '#ccc' : '#333'
        },
        splitLine: {
            show: true,
            lineStyle: { color: isDark ? '#333' : '#eee' }
        }
      },
      dataZoom,
      series: [{
        type: 'custom',
        renderItem: renderItem as any,
        clip: true, // Optimization: enable clipping
        itemStyle: {
          opacity: 0.8
        },
        encode: {
          x: [1, 2],
          y: 0,
          tooltip: [0, 1, 2, 3, 4]
        },
        data: chartData
      }],
      // Add visualMap for legend if useful, but maybe too complex for dynamic values
      // For now, implicit coloring is fine.
    };
  }
}
