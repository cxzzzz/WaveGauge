import type { ZoomRange } from '../../stores/analysis';
import type * as echarts from 'echarts';

export type AnalysisType = 'counter' | 'instant' | 'complete';

export type History = {
  timestamps: number[];
  values: Record<string, number[]>;
};

export type AnalysisRunResult = {
  history: History;
  isMultiseries: boolean;
};

export type RunAnalysisParams = {
  apiUrl: string;
  wavePath: string;
  transformCode: string;
  sampleRate: number;
};

export type ChartOptionParams = {
  history: History;
  chartType: string;
  zoomRange: ZoomRange;
  userMaxValue: number;
  isDark: boolean;
};

export type OptionItem = {
  label: string;
  value: string;
};

export abstract class AnalysisStrategy {
  abstract readonly type: AnalysisType;
  abstract readonly chartTypeOptions: OptionItem[];
  abstract readonly summaryTypeOptions: OptionItem[];
  abstract runAnalysis(params: RunAnalysisParams): Promise<AnalysisRunResult>;
  abstract calculateSummary(history: History, summaryType: string): Record<string, number>;
  abstract buildChartOption(params: ChartOptionParams): echarts.EChartsOption;
}
