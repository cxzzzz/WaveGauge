import type * as echarts from 'echarts';
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

export class CompleteStrategy extends AnalysisStrategy<CompleteData> {
  readonly type = 'complete';
  readonly chartTypeOptions = [];
  readonly summaryTypeOptions = [];

  getEmptyData(): CompleteData {
    return { series: {}, is_multiseries: false };
  }

  async runAnalysis(_: RunAnalysisParams): Promise<AnalysisRunResult<CompleteData>> {
    return { data: this.getEmptyData(), isMultiseries: false };
  }

  calculateSummary(_: SummaryParams<CompleteData>): Record<string, number> {
    return {};
  }

  getDisplayMaxValues(_: DisplayMaxParams<CompleteData>): Record<string, number> {
    return {};
  }

  buildChartOption(_: ChartOptionParams<CompleteData>): echarts.EChartsOption {
    return { series: [] };
  }
}
