import type * as echarts from 'echarts';
import {
  AnalysisStrategy,
  type AnalysisRunResult,
  type ChartOptionParams,
  type History,
  type RunAnalysisParams
} from './AnalysisStrategy';

export class CompleteStrategy extends AnalysisStrategy {
  readonly type = 'complete';
  readonly chartTypeOptions = [];
  readonly summaryTypeOptions = [];

  async runAnalysis(_: RunAnalysisParams): Promise<AnalysisRunResult> {
    return { history: { timestamps: [], values: {} }, isMultiseries: false };
  }

  calculateSummary(_: History, __: string): Record<string, number> {
    return {};
  }

  buildChartOption(_: ChartOptionParams): echarts.EChartsOption {
    return { series: [] };
  }
}
