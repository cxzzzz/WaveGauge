<template>
  <a-popover placement="bottomRight">
    <template #content>
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-gray-500 dark:text-[#a0a0a0]">Current</span>
          <div class="flex items-center gap-2">
            <div class="w-[70px]">
              <a-progress
                :percent="currentPercent"
                stroke-color="#1677ff"
                :show-info="false"
                size="small"
              />
            </div>
            <span class="text-gray-600 dark:text-[#c0c0c0] font-mono text-xs text-right flex items-center justify-end w-[96px]">
              <span class="w-[50px] inline-block text-right">{{ currentText }}</span>
              <span class="w-[36px] inline-block text-right text-[10px] text-gray-400 dark:text-[#8a8a8a]">{{ currentRatioText }}</span>
            </span>
          </div>
        </div>
        <div v-if="hasBaseline" class="flex items-center justify-between gap-3">
          <span class="text-xs text-gray-500 dark:text-[#a0a0a0]">Baseline</span>
          <div class="flex items-center gap-2">
            <div class="w-[70px]">
              <a-progress
                :percent="baselinePercent"
                stroke-color="#1677ff"
                :show-info="false"
                size="small"
              />
            </div>
            <span class="text-gray-600 dark:text-[#c0c0c0] font-mono text-xs text-right flex items-center justify-end w-[96px]">
              <span class="w-[50px] inline-block text-right">{{ baselineText }}</span>
              <span class="w-[36px] inline-block text-right text-[10px] text-gray-400 dark:text-[#8a8a8a]">{{ baselineRatioText }}</span>
            </span>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-gray-500 dark:text-[#a0a0a0]">Max</span>
            <span class="text-gray-600 dark:text-[#c0c0c0] font-mono text-xs w-[50px] text-right">{{ maxText }}</span>
        </div>
      </div>
    </template>
    <div class="flex items-center gap-0.5">
      <div class="w-[64px]">
        <a-progress 
          :percent="currentPercent"
          stroke-color="#1677ff"
          :show-info="false"
          size="small" 
        />
      </div>
      <span class="text-gray-500 dark:text-[#a0a0a0] font-mono text-right text-xs" :class="valueWidthClass">
        {{ currentText }}
      </span>
      <span v-if="hasBaseline" :class="deltaPercentClass" class="text-[10px] font-semibold min-w-[40px] text-right">
        {{ deltaPercentText }}
      </span>
    </div>
  </a-popover>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';

const props = withDefaults(defineProps<{
  currentValue?: number;
  baselineValue?: number;
  maxValue?: number;
  hasBaseline?: boolean;
  valueWidthClass?: string;
}>(), {
  valueWidthClass: 'w-[48px]',
  hasBaseline: false
});

const { currentValue, baselineValue, maxValue, hasBaseline, valueWidthClass } = toRefs(props);

const formatNumber = (val: number) => {
  if (!Number.isFinite(val)) return '--';
  const fixed = val.toFixed(3);
  return fixed.replace(/\.?0+$/, '');
};

const formatOptionalNumber = (val: unknown) => {
  const num = Number(val);
  if (!Number.isFinite(num)) return '--';
  return formatNumber(num);
};

const effectiveMax = computed(() => {
  const max = Number(maxValue.value);
  return Number.isFinite(max) ? max : 0;
});

const calcPercent = (val: number | undefined, maxVal: number) => {
  const numeric = Number(val);
  if (!Number.isFinite(numeric)) return 0;
  if (!(maxVal > 0)) return 0;
  return Math.min(Math.max((numeric / maxVal) * 100, 0), 100);
};

const calcDelta = (current: number | undefined, baseline: number | undefined) => {
  const cur = Number(current);
  const base = Number(baseline);
  if (!Number.isFinite(cur) || !Number.isFinite(base)) return undefined;
  if (base === 0) return cur >= 0 ? 'pos_inf' : 'neg_inf';
  return ((cur - base) / base) * 100;
};

const currentPercent = computed(() => calcPercent(currentValue.value, effectiveMax.value));
const baselinePercent = computed(() => calcPercent(baselineValue.value, effectiveMax.value));
const currentText = computed(() => formatOptionalNumber(currentValue.value));
const baselineText = computed(() => formatOptionalNumber(baselineValue.value));
const maxText = computed(() => formatOptionalNumber(effectiveMax.value));
const currentRatioText = computed(() => {
  const current = Number(currentValue.value);
  if (!Number.isFinite(current) || !(effectiveMax.value > 0)) return '(--)';
  return `(${currentPercent.value.toFixed(1)}%)`;
});
const baselineRatioText = computed(() => {
  const baseline = Number(baselineValue.value);
  if (!Number.isFinite(baseline) || !(effectiveMax.value > 0)) return '(--)';
  return `(${baselinePercent.value.toFixed(1)}%)`;
});
const delta = computed(() => calcDelta(currentValue.value, baselineValue.value));
const deltaPercentText = computed(() => {
  if (delta.value === 'pos_inf') return '(+∞)';
  if (delta.value === 'neg_inf') return '(-∞)';
  if (delta.value === undefined) return '--';
  return `(${delta.value >= 0 ? '+' : '-'}${Math.abs(delta.value).toFixed(1)}%)`;
});
const deltaPercentClass = computed(() => {
  if (delta.value === 'pos_inf') return 'text-orange-500';
  if (delta.value === 'neg_inf') return 'text-purple-500';
  if (delta.value === undefined) return 'text-gray-400 dark:text-[#8a8a8a]';
  if (delta.value > 0) return 'text-orange-500';
  if (delta.value < 0) return 'text-purple-500';
  return 'text-gray-400 dark:text-[#8a8a8a]';
});
</script>
