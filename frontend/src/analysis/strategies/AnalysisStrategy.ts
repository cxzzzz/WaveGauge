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
}
