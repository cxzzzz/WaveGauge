<template>
  <a-popover placement="bottomRight">
    <template #content>
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-gray-500 dark:text-[#a0a0a0]">Current</span>
          <div class="flex items-center gap-2">
            <div class="w-[70px]">
              <a-progress
                :percent="item.currentPercent"
                stroke-color="#1677ff"
                :show-info="false"
                size="small"
              />
            </div>
            <span class="text-gray-600 dark:text-[#c0c0c0] font-mono text-xs text-right">
              <span class="w-[50px] inline-block text-right">{{ item.currentText }}</span>
              <span class="ml-1 text-[10px] text-gray-400 dark:text-[#8a8a8a]">{{ item.currentRatioText }}</span>
            </span>
          </div>
        </div>
        <div v-if="item.hasBaseline" class="flex items-center justify-between gap-3">
          <span class="text-xs text-gray-500 dark:text-[#a0a0a0]">Baseline</span>
          <div class="flex items-center gap-2">
            <div class="w-[70px]">
              <a-progress
                :percent="item.baselinePercent"
                stroke-color="#1677ff"
                :show-info="false"
                size="small"
              />
            </div>
            <span class="text-gray-600 dark:text-[#c0c0c0] font-mono text-xs w-[50px] text-right">{{ item.baselineText }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-gray-500 dark:text-[#a0a0a0]">Max</span>
          <span class="text-gray-600 dark:text-[#c0c0c0] font-mono text-xs w-[50px] text-right">{{ item.maxText }}</span>
        </div>
      </div>
    </template>
    <div class="flex items-center gap-0.5">
      <div class="w-[64px]">
        <a-progress 
          :percent="item.currentPercent"
          stroke-color="#1677ff"
          :show-info="false"
          size="small" 
        />
      </div>
      <span class="text-gray-500 dark:text-[#a0a0a0] font-mono text-right text-xs" :class="valueWidthClass">
        {{ item.currentText }}
      </span>
      <span v-if="item.hasBaseline" :class="item.deltaPercentClass" class="text-[10px] font-semibold min-w-[40px] text-right">
        {{ item.deltaPercentText }}
      </span>
    </div>
  </a-popover>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';

const props = withDefaults(defineProps<{
  item: {
    hasBaseline: boolean;
    currentText: string;
    baselineText: string;
    currentPercent: number;
    baselinePercent: number;
    currentRatioText: string;
    deltaPercentText: string;
    deltaPercentClass: string;
    maxText: string;
  };
  valueWidthClass?: string;
}>(), {
  valueWidthClass: 'w-[48px]'
});

const { item, valueWidthClass } = toRefs(props);
</script>
