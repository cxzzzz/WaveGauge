<template>
  <div class="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#303030] rounded mb-2 overflow-hidden transition-colors duration-300">
    <!-- Header: Metric Name & Value -->
    <div class="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-[#141414] transition-colors duration-300">
      <div class="font-medium text-gray-900 dark:text-[#e0e0e0]">
        <span>{{ name }}</span>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Single Value Mode -->
        <template v-if="!isMultiValue">
          <div class="w-[100px]">
            <a-progress 
              :percent="Math.min(Math.max(Number(value) * 100, 0), 100)" 
              :stroke-color="getProgressColor(Number(value))"
              :show-info="false"
              size="small" 
            />
          </div>
          <span class="text-gray-500 dark:text-[#a0a0a0] font-mono w-[45px] text-right">{{ (Number(value) * 100).toFixed(1) }}%</span>
        </template>
        
        <!-- Toggle Buttons -->
        <div class="flex gap-1">
          <!-- Timeline Toggle -->
          <a-button 
            type="text" 
            size="small" 
            class="!text-gray-500 hover:!text-[#1890ff] dark:!text-gray-400 dark:hover:!text-[#1890ff]"
            @click="showTimeline = !showTimeline"
          >
            <template #icon>
              <bar-chart-outlined />
            </template>
          </a-button>

          <!-- Code Toggle -->
          <a-button 
            type="text" 
            size="small" 
            class="!text-gray-500 hover:!text-[#1890ff] dark:!text-gray-400 dark:hover:!text-[#1890ff]"
            @click="expanded = !expanded"
          >
            <template #icon>
              <code-outlined v-if="!expanded" />
              <up-outlined v-else />
            </template>
          </a-button>
        </div>
      </div>
    </div>

    <!-- Timeline Section (Collapsible) -->
    <div v-if="showTimeline" class="p-3 bg-white dark:bg-[#1f1f1f] border-t border-gray-100 dark:border-[#2a2a2a] transition-colors duration-300">
      <div ref="chartRef" class="w-full h-[200px]"></div>
    </div>

    <!-- Multi-Value List (Always visible if expanded or just below header? 
         User said "one line per metric". Let's put it in the body but above the editor, 
         or maybe replacing the single value in header? 
         Actually, if it's a dict, it might be too large for header. 
         Let's put it in a dedicated section below header but above editor if expanded, 
         OR just show it in the header if it fits? 
         User said: "if multi-indicator, have a total name (name), then value input a dict, each dict per line".
         Let's put the breakdown in the body, visible when expanded or always visible?
         Usually "Analysis" component implies the result is shown.
         Let's show the breakdown list below the header.
    -->
    <div v-if="isMultiValue" class="px-3 py-2 bg-white dark:bg-[#1f1f1f] border-t border-gray-100 dark:border-[#2a2a2a]">
      <div v-for="(val, key) in (value as Record<string, number>)" :key="key" class="flex justify-between items-center py-1">
        <span class="text-sm text-gray-600 dark:text-[#a0a0a0]">{{ key }}</span>
        <div class="flex items-center gap-3">
          <div class="w-[100px]">
             <a-progress 
              :percent="Math.min(Math.max(Number(val) * 100, 0), 100)" 
              :stroke-color="getProgressColor(Number(val))"
              :show-info="false"
              size="small" 
            />
          </div>
          <span class="text-gray-500 dark:text-[#a0a0a0] font-mono w-[45px] text-right text-sm">{{ (Number(val) * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- Body: Logic Editor (Collapsible) -->
    <div v-if="expanded" class="p-3 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#303030] transition-colors duration-300">
      <div class="border border-gray-200 dark:border-[#303030] rounded overflow-hidden mb-2">
        <Codemirror
          :model-value="code"
          @update:model-value="$emit('update:code', $event)"
          placeholder="Enter Python logic..."
          :style="{ height: '150px' }"
          :autofocus="true"
          :indent-with-tab="true"
          :tab-size="4"
          :extensions="extensions"
        />
      </div>
      <div class="flex justify-end">
        <a-button type="primary" size="small" @click="$emit('run')">
          <play-circle-outlined /> Run
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { 
  CodeOutlined, 
  UpOutlined, 
  PlayCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons-vue';
import * as echarts from 'echarts';
import { Codemirror } from 'vue-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

const props = defineProps<{
  name: string;
  value: number | Record<string, number>; // Support number or dict
  code: string;
  history?: Array<{ step: string | number; [key: string]: any }>;
}>();

defineEmits<{
  (e: 'update:code', val: string): void;
  (e: 'run'): void;
}>();

const expanded = ref(false);
const showTimeline = ref(false);
const chartRef = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;
const isDark = ref(false);

const isMultiValue = computed(() => {
  return typeof props.value === 'object' && props.value !== null;
});

const extensions = computed(() => {
  return isDark.value ? [python(), oneDark] : [python()];
});

const getProgressColor = (val: number) => {
  if (val < 0.5) return '#52c41a'; // Green
  if (val < 0.8) return '#faad14'; // Yellow
  return '#ff4d4f'; // Red
};

// Initialize Chart
const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
    updateChart();
  }
};

const updateChart = () => {
  if (!chartInstance || !props.history || props.history.length === 0) return;

  const textColor = isDark.value ? '#a0a0a0' : '#666';
  const axisColor = isDark.value ? '#404040' : '#e0e0e0';

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: {
      top: 10,
      bottom: 20,
      left: 10,
      right: 10,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: isDark.value ? '#1f1f1f' : '#fff',
      borderColor: isDark.value ? '#303030' : '#f0f0f0',
      textStyle: { color: isDark.value ? '#e0e0e0' : '#333' }
    },
    xAxis: {
      type: 'category',
      data: props.history.map(h => h.step),
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor, fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { show: false }, // Clean look
      axisLabel: { show: false }  // Clean look
    },
    series: []
  };

  if (isMultiValue.value) {
    // Multi-value: Stacked Bar
    // Get all keys from the current value prop
    const keys = Object.keys(props.value as Record<string, number>);
    
    (option.series as any[]) = keys.map(key => ({
      name: key,
      type: 'bar',
      stack: 'total',
      data: props.history!.map(h => h[key] || 0),
      emphasis: { focus: 'series' }
    }));
  } else {
    // Single Value: Simple Bar
    (option.series as any[]) = [{
      type: 'bar',
      data: props.history.map(h => h.value),
      itemStyle: { color: '#1890ff' }
    }];
  }

  chartInstance.setOption(option);
};

// Watch theme changes
let observer: MutationObserver | null = null;

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');

  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        isDark.value = document.documentElement.classList.contains('dark');
        if (showTimeline.value && chartInstance) {
           updateChart();
        }
      }
    });
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
});

// Watchers
watch(showTimeline, async (val) => {
  if (val) {
    await nextTick();
    initChart();
  } else {
    if (chartInstance) {
      chartInstance.dispose();
      chartInstance = null;
    }
  }
});

watch(() => props.history, () => {
  if (showTimeline.value && chartInstance) {
    updateChart();
  }
}, { deep: true });

// Handle Resize
const handleResize = () => {
  chartInstance?.resize();
};

window.addEventListener('resize', handleResize);

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
  observer?.disconnect();
});
</script>
