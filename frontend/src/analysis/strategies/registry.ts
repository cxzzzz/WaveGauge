import type { InjectionKey } from 'vue';
import type { AnalysisStrategy, AnalysisType } from './AnalysisStrategy';
import { CompleteStrategy } from './CompleteStrategy';
import { CounterStrategy } from './CounterStrategy';
import { InstantStrategy } from './InstantStrategy';

export class AnalysisStrategyRegistry {
  private readonly strategies: Record<AnalysisType, AnalysisStrategy>;

  constructor(overrides?: Partial<Record<AnalysisType, AnalysisStrategy>>) {
    this.strategies = {
      counter: new CounterStrategy(),
      instant: new InstantStrategy(),
      complete: new CompleteStrategy(),
      ...overrides
    };
  }

  getStrategy(type: AnalysisType): AnalysisStrategy {
    return this.strategies[type];
  }
}

export const analysisStrategyRegistryKey: InjectionKey<AnalysisStrategyRegistry> = Symbol(
  'analysisStrategyRegistry'
);
