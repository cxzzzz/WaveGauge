import * as echarts from 'echarts';
import {
  AnalysisStrategy,
  type AnalysisRunResult,
  type ChartOptionParams,
  type DisplayMaxParams,
  type RunAnalysisParams,
  type SummaryParams
} from './AnalysisStrategy';

export type CompleteData = {
  series: Record<string, { timestamps: number[]; values: Array<number | string>; durations: number[] }>;
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
    return { series: {}, is_multiseries: false };
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
    return { 
      data: result.data, 
      isMultiseries: result.data.is_multiseries 
    };
  }

  calculateSummary(params: SummaryParams<CompleteData>): Record<string, number> {
    const { data, summaryType, zoomRange } = params;
    const { min, max } = this.getTimeBounds(data);
    const visible = this.getVisibleRange(zoomRange, min, max);
    const result: Record<string, number> = {};

    for (const [key, series] of Object.entries(data.series)) {
      let count = 0;
      let durationSum = 0;
      const { timestamps, durations } = series;
      for (let i = 0; i < timestamps.length; i++) {
        const start = timestamps[i];
        if (start === undefined) {
          continue;
        }
        const duration = durations[i] ?? 0;
        const end = start + duration;
        if (start < visible.end && end > visible.start) {
          count++;
          durationSum += duration;
        }
      }
      if (summaryType === 'avg_duration') {
        result[key] = count ? durationSum / count : Number.NaN;
      } else {
        result[key] = count;
      }
    }
    return result;
  }

  getDisplayMaxValues(_params: DisplayMaxParams<CompleteData>): Record<string, number> {
    // Not typically used for timeline charts, returning empty or placeholders
    return {}; 
  }

  private getTimeBounds(data: CompleteData): { min: number; max: number } {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    Object.values(data.series).forEach((series) => {
      series.timestamps.forEach((start, index) => {
        if (start === undefined) {
          return;
        }
        const duration = series.durations[index] ?? 0;
        const end = start + duration;
        if (start < min) min = start;
        if (end > max) max = end;
      });
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 0 };
    }
    return { min, max };
  }

  private getVisibleRange(zoomRange: { start: number; end: number }, min: number, max: number) {
    const range = max - min;
    if (range <= 0) {
      return { start: min, end: max };
    }
    const startPercent = Math.min(100, Math.max(0, zoomRange.start));
    const endPercent = Math.min(100, Math.max(0, zoomRange.end === Number.MAX_SAFE_INTEGER ? 100 : zoomRange.end));
    return {
      start: min + (range * startPercent) / 100,
      end: min + (range * endPercent) / 100
    };
  }

  buildChartOption(params: ChartOptionParams<CompleteData>): echarts.EChartsOption {
    const { data, isDark, zoomRange } = params;
    const seriesKeys = Object.keys(data.series);
    if (seriesKeys.length === 0) return {};

    const chartData: any[] = [];
    const categories = seriesKeys;
    const { min, max } = this.getTimeBounds(data);
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
