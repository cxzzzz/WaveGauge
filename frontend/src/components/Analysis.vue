<template>
  <div class="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#303030] rounded-sm mb-1 overflow-hidden transition-colors duration-300">
    <!-- Header: Metric Name & Value -->
    <div class="flex justify-between items-center px-2 py-1.5 bg-gray-50 dark:bg-[#141414] transition-colors duration-300 analysis-header cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a1a]">
      <div class="flex items-center gap-1.5 font-medium text-gray-900 dark:text-[#e0e0e0] text-sm flex-1 mr-2">
        <!-- Drag Handle -->
        <holder-outlined class="cursor-move text-gray-400 dark:text-[#666] hover:text-gray-600 dark:hover:text-[#aaa]" />
        
        <!-- Editable Name -->
        <div v-if="isEditingName" class="flex-1" @click.stop>
          <a-input 
            ref="nameInput"
            v-model:value="localName" 
            size="small" 
            @blur="saveName" 
            @pressEnter="saveName"
            class="!text-xs"
          />
        </div>
        <span v-else @dblclick="startEditing" class="truncate" :title="description">{{ name }}</span>
        <edit-outlined v-if="!isEditingName" class="text-xs text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" @click.stop="startEditing" />
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Single Value Mode -->
        <template v-if="!isMultiValue">
          <div class="w-[70px]">
            <a-progress 
              :percent="Math.min(Math.max(Number(value) * 100, 0), 100)" 
              :stroke-color="getProgressColor(Number(value))"
              :show-info="false"
              size="small" 
            />
          </div>
          <span class="text-gray-500 dark:text-[#a0a0a0] font-mono w-[35px] text-right text-xs">{{ (Number(value) * 100).toFixed(1) }}%</span>
        </template>
        
        <!-- Toggle Buttons -->
        <div class="flex gap-1" @click.stop>
          <!-- Info/Description Toggle -->
          <a-popover trigger="click" placement="bottomRight">
            <template #content>
              <div class="w-[300px]">
                <div class="mb-2 font-bold text-xs">Description</div>
                <a-textarea 
                  :value="description" 
                  @update:value="$emit('update:description', $event)" 
                  placeholder="Add a description for this metric..." 
                  :rows="3"
                  class="!text-xs mb-2"
                />
              </div>
            </template>
            <a-button 
              type="text" 
              size="small" 
              class="!text-gray-500 hover:!text-[#1890ff] dark:!text-gray-400 dark:hover:!text-[#1890ff] !h-6 !px-1"
            >
              <template #icon>
                <info-circle-outlined />
              </template>
            </a-button>
          </a-popover>

          <!-- Timeline Toggle -->
          <a-button 
            type="text" 
            size="small" 
            class="!text-gray-500 hover:!text-[#1890ff] dark:!text-gray-400 dark:hover:!text-[#1890ff] !h-6 !px-1"
            @click="showTimeline = !showTimeline"
          >
            <template #icon>
              <bar-chart-outlined />
            </template>
          </a-button>

          <!-- Dropdown Menu -->
          <a-dropdown trigger="click" placement="bottomRight">
            <a-button 
              type="text" 
              size="small" 
              class="!text-gray-500 hover:!text-gray-800 dark:!text-[#aaa] dark:hover:!text-white !h-6 !px-1"
            >
              <template #icon><more-outlined /></template>
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="run" @click="runAnalysis">
                  <play-circle-outlined /> Run Analysis
                </a-menu-item>
                <a-menu-item key="code" @click="expanded = !expanded">
                  <code-outlined v-if="!expanded" />
                  <up-outlined v-else />
                  {{ expanded ? 'Hide Logic' : 'Show Logic' }}
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="delete" danger @click="$emit('delete')">
                  <delete-outlined /> Delete Analysis
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </div>

    <!-- Timeline Section (Collapsible) -->
    <div v-if="showTimeline" class="p-2 bg-white dark:bg-[#1f1f1f] border-t border-gray-100 dark:border-[#2a2a2a] transition-colors duration-300">
      <div ref="chartRef" class="w-full h-[150px]"></div>
    </div>

    <!-- Multi-Value List -->
    <div v-if="isMultiValue" class="px-2 py-1 bg-white dark:bg-[#1f1f1f] border-t border-gray-100 dark:border-[#2a2a2a]">
      <div v-for="(val, key) in (value as Record<string, number>)" :key="key" class="flex justify-between items-center py-0.5">
        <span class="text-xs text-gray-600 dark:text-[#a0a0a0]">{{ key }}</span>
        <div class="flex items-center gap-2">
          <div class="w-[70px]">
             <a-progress 
              :percent="Math.min(Math.max(Number(val) * 100, 0), 100)" 
              :stroke-color="getProgressColor(Number(val))"
              :show-info="false"
              size="small" 
            />
          </div>
          <span class="text-gray-500 dark:text-[#a0a0a0] font-mono w-[35px] text-right text-xs">{{ (Number(val) * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- Body: Logic Editor (Collapsible) -->
    <div v-if="expanded" class="p-2 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#303030] transition-colors duration-300">
      
      <!-- Transform Logic Editor -->
      <div class="mb-2">
        <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wider">
          Data Processing Logic
        </div>
        <div class="border border-gray-200 dark:border-[#303030] rounded-sm overflow-hidden flex flex-col">
          <Codemirror
            :model-value="transformCode"
            @update:model-value="$emit('update:transformCode', $event)"
            placeholder="# Enter logic to process raw waveforms..."
            :style="{ height: transformEditorHeight + 'px' }"
            :autofocus="false"
            :indent-with-tab="true"
            :tab-size="4"
            :extensions="extensions"
          />
          <!-- Resize Handle -->
          <div 
            class="h-1.5 bg-gray-100 dark:bg-[#2a2a2a] cursor-row-resize hover:bg-blue-400 dark:hover:bg-blue-600 transition-colors flex justify-center items-center"
            @mousedown.prevent="startResize($event, 'transform')"
          >
             <div class="w-8 h-0.5 bg-gray-300 dark:bg-[#404040] rounded-full"></div>
          </div>
        </div>
      </div>

      <!-- Metric Calculation Editor -->
      <div class="mb-2">
        <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
          Metric Evaluation Logic
        </div>
        <div class="border border-gray-200 dark:border-[#303030] rounded-sm overflow-hidden flex flex-col">
          <Codemirror
            :model-value="metricCode"
            @update:model-value="$emit('update:metricCode', $event)"
            placeholder="# Enter logic to calculate overall metric value..."
            :style="{ height: metricEditorHeight + 'px' }"
            :autofocus="false"
            :indent-with-tab="true"
            :tab-size="4"
            :extensions="extensions"
          />
          <!-- Resize Handle -->
          <div 
            class="h-1.5 bg-gray-100 dark:bg-[#2a2a2a] cursor-row-resize hover:bg-blue-400 dark:hover:bg-blue-600 transition-colors flex justify-center items-center"
            @mousedown.prevent="startResize($event, 'metric')"
          >
             <div class="w-8 h-0.5 bg-gray-300 dark:bg-[#404040] rounded-full"></div>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <a-button type="primary" size="small" @click="runAnalysis">
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
  BarChartOutlined,
  HolderOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  MoreOutlined
} from '@ant-design/icons-vue';
import * as echarts from 'echarts';
import { Codemirror } from 'vue-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import axios from 'axios';
import { message } from 'ant-design-vue';

const API_URL = 'http://localhost:8000/api';

const props = defineProps<{
  name: string;
  metricCode: string;
  transformCode?: string;
  description?: string;
  result?: number | Record<string, number>;
  history?: Array<{ step: string | number; [key: string]: any }>;
}>();

const emit = defineEmits<{
  (e: 'update:metricCode', val: string): void;
  (e: 'update:transformCode', val: string): void;
  (e: 'update:name', val: string): void;
  (e: 'update:description', val: string): void;
  (e: 'update:result', val: number | Record<string, number>): void;
  (e: 'update:history', val: Array<{ step: string | number; [key: string]: any }>): void;
  (e: 'delete'): void;
}>();

const isEditingName = ref(false);
const localName = ref(props.name);
const nameInput = ref<HTMLInputElement | null>(null);

const value = computed(() => props.result ?? 0);
const historyData = computed(() => props.history ?? []);

watch(() => props.name, (val) => {
  localName.value = val;
});

const startEditing = async () => {
  isEditingName.value = true;
  await nextTick();
  nameInput.value?.focus();
};

const saveName = () => {
  isEditingName.value = false;
  if (localName.value !== props.name) {
    emit('update:name', localName.value);
  }
};

const runAnalysis = async () => {
  message.loading(`Running analysis for ${props.name}...`, 0);
  
  try {
    const response = await axios.post(`${API_URL}/analyze`, {
      file_path: 'dummy.fsdb', // Placeholder
      transform_code: props.transformCode,
      metric_code: props.metricCode
    });

    if (response.data.status === 'success') {
      message.destroy();
      message.success(`Analysis for ${props.name} completed!`);
      
      // Update value
      emit('update:result', response.data.metrics);
      
      // Update history/table data
      if (response.data.data && response.data.data.length > 0) {
          const newHistory: any[] = [];
          
          // Map backend data to history format based on analysis type
          // This is a simplified mapping for the demo
          response.data.data.forEach((row: any, index: number) => {
             if (index < 20) { // Limit for chart
                 const step = row.timestamp ? String(row.timestamp) : String(index);
                 
                 // Basic heuristic mapping based on what keys are available
                 if (props.name.includes('Compute')) {
                     newHistory.push({
                         step,
                         value: row.sm_active || 0
                     });
                 } else if (props.name.includes('Memory')) {
                     // Simple demo mapping
                     newHistory.push({
                         step,
                         value: (row.dram_read || 0) / 100 
                     });
                 } else if (props.name.includes('L2')) {
                     // Map to multi-value keys
                     newHistory.push({
                         step,
                         "L2 Hit Rate": row.l2_hit || 0,
                         "L2 Throughput": (row.l2_hit || 0) * 0.5,
                         "L2 Write Hit Rate": (row.l2_hit || 0) * 1.1
                     });
                 } else {
                    // Fallback generic mapping if possible, or just push row
                    // For now, if no match, maybe we don't push?
                    // Or we assume single value 'sm_active' as default?
                    // Let's assume 'sm_active' for unknown types for now to show something
                    newHistory.push({
                        step,
                        value: row.sm_active || 0
                     });
                 }
             }
          });
          emit('update:history', newHistory);
      }
      
    } else {
      message.destroy();
      message.error(`Error: ${response.data.error}`);
    }
  } catch (error: any) {
    message.destroy();
    message.error(`Request failed: ${error.message}`);
  }
};

const expanded = ref(false);
const showTimeline = ref(false);
const chartRef = ref<HTMLElement | null>(null);
const isDark = ref(false);
const transformEditorHeight = ref(120);
const metricEditorHeight = ref(120);
let chartInstance: echarts.ECharts | null = null;


// Resize logic
const startResize = (e: MouseEvent, type: 'transform' | 'metric') => {
  const startY = e.clientY;
  const startHeight = type === 'transform' ? transformEditorHeight.value : metricEditorHeight.value;

  const onMouseMove = (ev: MouseEvent) => {
    const delta = ev.clientY - startY;
    const newHeight = Math.max(50, startHeight + delta); // Min height 50px
    if (type === 'transform') {
      transformEditorHeight.value = newHeight;
    } else {
      metricEditorHeight.value = newHeight;
    }
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'row-resize';
};

const isMultiValue = computed(() => {
  return typeof value.value === 'object' && value.value !== null;
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
  if (!chartInstance || !historyData.value || historyData.value.length === 0) return;

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
      backgroundColor: isDark.value ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
      borderColor: isDark.value ? '#555' : '#eee',
      textStyle: {
        color: textColor
      }
    },
    xAxis: {
      type: 'category',
      data: historyData.value.map(item => item.step),
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: isDark.value ? '#333' : '#eee' } }
    },
    series: []
  };

  // Dynamically generate series based on keys in historyData
  const keys = Object.keys(historyData.value[0]).filter(k => k !== 'step');
  
  keys.forEach(key => {
    option.series!.push({
      name: key,
      data: historyData.value.map(item => item[key]),
      type: 'line',
      smooth: true,
      showSymbol: false,
      areaStyle: {
        opacity: 0.1
      }
    });
  });

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
