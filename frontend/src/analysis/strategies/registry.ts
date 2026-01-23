import type { InjectionKey } from 'vue';
import type { AnalysisStrategy, AnalysisType } from './AnalysisStrategy';
import { CompleteStrategy } from './CompleteStrategy';
import { CounterStrategy } from './CounterStrategy';
import { InstantStrategy } from './InstantStrategy';

export class AnalysisStrategyRegistry {
  private readonly strategies: Record<AnalysisType, AnalysisStrategy<unknown>>;

  constructor(overrides?: Partial<Record<AnalysisType, AnalysisStrategy<unknown>>>) {
    this.strategies = {
      counter: new CounterStrategy(),
      instant: new InstantStrategy(),
      complete: new CompleteStrategy(),
      ...overrides
    };
  }

  getStrategy(type: AnalysisType): AnalysisStrategy<unknown> {
    return this.strategies[type];
  }

  getTypes(): AnalysisType[] {
    return Object.keys(this.strategies) as AnalysisType[];
  }
}

export const analysisStrategyRegistryKey: InjectionKey<AnalysisStrategyRegistry> = Symbol(
  'analysisStrategyRegistry'
);
