import type { ZoomRange } from '../../stores/analysis';
import type * as echarts from 'echarts';

export type AnalysisType = 'counter' | 'instant' | 'complete';

export type AnalysisRunResult<TData> = {
  data: TData;
  isMultiseries: boolean;
};

export type RunAnalysisParams = {
  apiUrl: string;
  wavePath: string;
  transformCode: string;
  sampleRate: number;
};

export type ChartOptionParams<TData> = {
  data: TData;
  chartType: string;
  zoomRange: ZoomRange;
  userMaxValue: number;
  isDark: boolean;
};

export type SummaryParams<TData> = {
  data: TData;
  summaryType: string;
  zoomRange: ZoomRange;
};

export type DisplayMaxParams<TData> = {
  data: TData;
  summaryValues: Record<string, number>;
  userMaxValue: number;
  zoomRange: ZoomRange;
  chartType: string;
};

export type OptionItem = {
  label: string;
  value: string;
};

export abstract class AnalysisStrategy<TData> {
  abstract readonly type: AnalysisType;
  abstract readonly chartTypeOptions: OptionItem[];
  abstract readonly summaryTypeOptions: OptionItem[];
  abstract getEmptyData(): TData;
  abstract runAnalysis(params: RunAnalysisParams): Promise<AnalysisRunResult<TData>>;
  abstract calculateSummary(params: SummaryParams<TData>): Record<string, number>;
  abstract getDisplayMaxValues(params: DisplayMaxParams<TData>): Record<string, number>;
  abstract buildChartOption(params: ChartOptionParams<TData>): echarts.EChartsOption;

  protected findStartIndex(timestamps: Float64Array, minTime: number): number {
    let low = 0;
    let high = timestamps.length - 1;
    let idx = timestamps.length;
    
    while (low <= high) {
      const mid = (low + high) >>> 1;
      if (timestamps[mid]! >= minTime) {
        idx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return idx;
  }

  protected findEndIndex(timestamps: Float64Array, maxTime: number): number {
    let low = 0;
    let high = timestamps.length - 1;
    let idx = -1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      if (timestamps[mid]! <= maxTime) {
        idx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return idx;
  }
}
