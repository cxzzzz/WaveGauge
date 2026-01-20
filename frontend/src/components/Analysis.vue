<template>
  <div class="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#303030] rounded-sm mb-1 overflow-hidden transition-colors duration-300">
    <!-- Header: Metric Name & Value -->
    <div class="flex justify-between items-center px-1.5 py-1 bg-gray-50 dark:bg-[#141414] transition-colors duration-300 analysis-header cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a1a]">
      <div class="flex items-center gap-1 font-medium text-gray-900 dark:text-[#e0e0e0] text-xs flex-1 mr-1.5">
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
        <template v-if="!isMultiValue">
          <template v-for="item in displayItems" :key="item.key">
            <ProgressValueDisplay
              :current-value="item.currentValue"
              :baseline-value="item.baselineValue"
              :max-value="item.maxValue"
              :has-baseline="item.hasBaseline"
              value-width-class="w-[35px]"
            />
          </template>
        </template>
        
        <!-- Toggle Buttons -->
        <div class="flex gap-0.5" @click.stop>
          <!-- Timeline Toggle -->
          <a-button 
            type="text" 
            size="small" 
            class="inline-flex items-center justify-center !text-gray-500 hover:!text-[#1890ff] dark:!text-gray-400 dark:hover:!text-[#1890ff] !h-5 !w-5 !px-0 !leading-none"
            @click="showTimeline = !showTimeline"
          >
            <template #icon>
              <bar-chart-outlined />
            </template>
          </a-button>

          <!-- Info/Description Toggle -->
          <a-popover trigger="click" placement="bottomRight">
            <template #content>
              <div class="w-[300px]">
                <div class="mb-2 font-bold text-xs">Description</div>
                <a-textarea 
                  :value="description" 
                  @update:value="updateCore({ description: $event })" 
                  placeholder="Add a description for this metric..." 
                  :rows="3"
                  class="!text-xs mb-2"
                />
              </div>
            </template>
            <a-button 
              type="text" 
              size="small" 
              class="inline-flex items-center justify-center !text-gray-500 hover:!text-[#1890ff] dark:!text-gray-400 dark:hover:!text-[#1890ff] !h-5 !w-5 !px-0 !leading-none"
            >
              <template #icon>
                <info-circle-outlined />
              </template>
            </a-button>
          </a-popover>

          <!-- Dropdown Menu -->
          <a-dropdown trigger="click" placement="bottomRight">
            <a-button 
              type="text" 
              size="small" 
              class="inline-flex items-center justify-center !text-gray-500 hover:!text-gray-800 dark:!text-[#aaa] dark:hover:!text-white !h-5 !w-5 !px-0 !leading-none"
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

    <div v-if="errorMessage" class="px-1.5 py-1 text-xs text-red-600 bg-red-50 dark:bg-[#2a1f1f] dark:text-red-300 border-t border-red-100 dark:border-[#3a2a2a]">
      {{ errorMessage }}
    </div>

    <div v-if="showTimeline" class="p-1.5 bg-white dark:bg-[#1f1f1f] border-t border-gray-100 dark:border-[#2a2a2a] transition-colors duration-300">
      <div v-if="hasBaselineComparison" class="w-full aspect-[16/5] grid grid-rows-2 gap-1">
        <div ref="chartRef" class="w-full h-full"></div>
        <div ref="baselineChartRef" class="w-full h-full"></div>
      </div>
      <div v-else ref="chartRef" class="w-full aspect-[16/5]"></div>
    </div>

    <!-- Multi-Value List -->
    <div v-if="isMultiValue" class="px-1.5 py-0.5 bg-white dark:bg-[#1f1f1f] border-t border-gray-100 dark:border-[#2a2a2a]">
      <div v-for="item in displayItems" :key="item.key" class="flex justify-between items-center py-0.5">
        <span class="text-xs text-gray-600 dark:text-[#a0a0a0]">{{ item.label }}</span>
        <div class="flex items-center gap-2">
          <ProgressValueDisplay
            :current-value="item.currentValue"
            :baseline-value="item.baselineValue"
            :max-value="item.maxValue"
            :has-baseline="item.hasBaseline"
            value-width-class="w-[48px]"
          />
        </div>
      </div>
    </div>

    <!-- Body: Logic Editor (Collapsible) -->
    <div v-if="expanded" class="p-2 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#303030] transition-colors duration-300">
      <div class="mb-2 flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Chart Type
          </div>
          <a-select
            v-model:value="chartTypeModel"
            size="small"
            class="!text-xs w-[160px]"
            :options="chartTypeOptions"
          />
        </div>
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Data Summary
          </div>
          <a-select
            v-model:value="summaryTypeModel"
            size="small"
            class="!text-xs w-[140px]"
            :options="summaryTypeOptions"
          />
        </div>
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Max Value
          </div>
          <a-input-number
            v-model:value="maxValueModel"
            size="small"
            :min="0"
            :step="0.01"
            class="!text-xs w-[120px]"
            placeholder="Auto"
          />
        </div>
      </div>

      <!-- Transform Logic Editor -->
      <div class="mb-2">
        <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wider">
          Data Processing Logic
        </div>
        <div class="border border-gray-200 dark:border-[#303030] rounded-sm overflow-hidden flex flex-col">
          <Codemirror
            :model-value="transformCode"
            @update:model-value="updateCore({ transformCode: $event })"
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
            @mousedown.prevent="startResize($event)"
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
import ProgressValueDisplay from './ProgressValueDisplay.vue';
import { useAnalysisStore } from '../stores/analysis';

const API_URL = 'http://localhost:8000/api';

type AnalysisCore = {
  name: string;
  transformCode?: string;
  description?: string;
  chartType?: string;
  summaryType?: string;
  maxValue?: number;
};

type AnalysisContext = {
  history?: Array<{ step: string | number; [key: string]: any }>;
  baselineHistory?: Array<{ step: string | number; [key: string]: any }>;
  tabId?: string;
};

const props = defineProps<{
  core: AnalysisCore;
  context?: AnalysisContext;
}>();

const emit = defineEmits<{
  (e: 'update:core', val: AnalysisCore): void;
  (e: 'update:context', val: AnalysisContext): void;
  (e: 'delete'): void;
}>();

const coreModel = computed({
  get: () => props.core,
  set: (val: AnalysisCore) => emit('update:core', val)
});
const contextModel = computed(() => props.context ?? {});
const updateCore = (patch: Partial<AnalysisCore>) => {
  emit('update:core', { ...props.core, ...patch });
};
const updateContext = (patch: Partial<AnalysisContext>) => {
  emit('update:context', { ...(props.context ?? {}), ...patch });
};
const name = computed(() => coreModel.value.name);
const description = computed(() => coreModel.value.description ?? '');
const transformCode = computed(() => coreModel.value.transformCode ?? '');
const isEditingName = ref(false);
const localName = ref(coreModel.value.name);
const nameInput = ref<HTMLInputElement | null>(null);
const errorMessage = ref('');
const chartTypeOptions = [
  { label: 'Bar', value: 'bar' },
  { label: 'Stacked Bar', value: 'stacked_bar' },
  { label: 'Line', value: 'line' },
  { label: 'Stacked Line', value: 'stacked_line' },
  { label: 'Heatmap', value: 'heatmap' }
];
const summaryTypeOptions = [
  { label: 'Average', value: 'avg' },
  { label: 'Maximum', value: 'max' },
  { label: 'Minimum', value: 'min' },
  { label: 'Sum', value: 'sum' }
];
const chartTypeModel = computed({
  get: () => coreModel.value.chartType ?? 'line',
  set: (val: string) => updateCore({ chartType: val })
});
const summaryTypeModel = computed({
  get: () => coreModel.value.summaryType ?? 'avg',
  set: (val: string) => updateCore({ summaryType: val })
});
const maxValueModel = computed({
  get: () => coreModel.value.maxValue,
  set: (val: number | null) => updateCore({ maxValue: val === null ? undefined : val ?? undefined })
});

const historyData = computed(() => contextModel.value.history ?? []);
const analysisStore = useAnalysisStore();
const tabId = computed(() => contextModel.value.tabId ?? '');
watch(tabId, (val) => {
  if (val) {
    analysisStore.ensureTab(val);
  }
}, { immediate: true });
const zoomStartValue = computed({
  get: () => {
    if (!tabId.value) return 0;
    return analysisStore.getZoomStart(tabId.value);
  },
  set: (val: number) => {
    if (!tabId.value) return;
    analysisStore.setZoomStart(tabId.value, val);
  }
});
const zoomEndValue = computed({
  get: () => {
    if (!tabId.value) return 100;
    return analysisStore.getZoomEnd(tabId.value);
  },
  set: (val: number) => {
    if (!tabId.value) return;
    analysisStore.setZoomEnd(tabId.value, val);
  }
});
const summaryValue = computed(() => {
  if (!historyData.value.length) return undefined;
  const summaryType = coreModel.value.summaryType ?? 'avg';
  return calculateSummary(
    getVisibleHistory(historyData.value, zoomStartValue.value, zoomEndValue.value),
    summaryType
  );
});
const hasResult = computed(() => summaryValue.value !== undefined);
const value = computed(() => summaryValue.value);
const wavePath = computed(() => {
  if (!tabId.value) return '';
  return analysisStore.getWavePath(tabId.value);
});
const sampleRate = computed(() => {
  if (!tabId.value) return 1;
  return analysisStore.getSampleRate(tabId.value);
});
const isBaseline = computed(() => {
  if (!tabId.value) return false;
  return analysisStore.baselineTabId === tabId.value;
});

const isMultiValue = computed(() => {
  return typeof value.value === 'object' && value.value !== null;
});

const hasBaselineComparison = computed(() => {
  if (isBaseline.value) return false;
  return baselineHistoryData.value.length > 0;
});
const baselineHistoryData = computed(() => contextModel.value.baselineHistory ?? []);
const baselineZoomStart = ref(zoomStartValue.value);
const baselineZoomEnd = ref(zoomEndValue.value);
const baselineSummaryValue = computed(() => {
  if (!hasBaselineComparison.value) return undefined;
  const summaryType = coreModel.value.summaryType ?? 'avg';
  return calculateSummary(
    getVisibleHistory(baselineHistoryData.value, baselineZoomStart.value, baselineZoomEnd.value),
    summaryType
  );
});

const getMaxForKey = (key: string) => {
  if (coreModel.value.maxValue !== undefined) return coreModel.value.maxValue;
  const visible = getVisibleHistory(historyData.value, zoomStartValue.value, zoomEndValue.value);
  let maxVal = 0;
  visible.forEach(item => {
    const v = Number(item[key]);
    if (Number.isFinite(v)) {
      if (v > maxVal) maxVal = v;
    }
  });
  return maxVal;
};

const effectiveMax = computed(() => {
  if (coreModel.value.maxValue !== undefined) return coreModel.value.maxValue;
  const visible = getVisibleHistory(historyData.value, zoomStartValue.value, zoomEndValue.value);
  const keys = Object.keys(visible[0] ?? {}).filter(k => k !== 'step');
  if (keys.length !== 1) return 0;
  const key = keys[0];
  if (!key) return 0;
  let maxVal = 0;
  visible.forEach(item => {
    const v = Number(item[key]);
    if (Number.isFinite(v)) {
      if (v > maxVal) maxVal = v;
    }
  });
  return maxVal;
});

const getMaxValueForDisplay = (key: string) => {
  if (key === '__single__') return Number(effectiveMax.value) || 0;
  return Number(getMaxForKey(key)) || 0;
};

const getBaselineValueForKey = (key: string) => {
  if (!hasBaselineComparison.value) return undefined;
  const base = baselineSummaryValue.value;
  if (base && typeof base === 'object') {
    return (base as Record<string, number>)[key];
  }
  return base as number | undefined;
};

type DisplayItem = {
  key: string;
  label: string;
  currentValue: number | undefined;
  baselineValue: number | undefined;
  maxValue: number;
  hasBaseline: boolean;
};

const displayItems = computed<DisplayItem[]>(() => {
  if (!isMultiValue.value) {
    const currentValue = hasResult.value ? Number(value.value) : undefined;
    const baselineValue = getBaselineValueForKey('__single__');
    return [{
      key: '__single__',
      label: '',
      currentValue,
      baselineValue,
      maxValue: getMaxValueForDisplay('__single__'),
      hasBaseline: hasBaselineComparison.value
    }];
  }
  const resultMap = value.value as Record<string, number>;
  return Object.keys(resultMap ?? {}).map((key) => {
    const currentValue = Number(resultMap[key]);
    const baselineValue = getBaselineValueForKey(key);
    return {
      key,
      label: key,
      currentValue,
      baselineValue,
      maxValue: getMaxValueForDisplay(key),
      hasBaseline: hasBaselineComparison.value
    };
  });
});

watch(name, (val) => {
  localName.value = val;
});

const startEditing = async () => {
  isEditingName.value = true;
  await nextTick();
  nameInput.value?.focus();
};

const saveName = () => {
  isEditingName.value = false;
  if (localName.value !== name.value) {
    updateCore({ name: localName.value });
  }
};

const runAnalysis = async () => {
  errorMessage.value = '';
  if (!wavePath.value?.trim()) {
    message.error('Waveform path is required');
    return;
  }
  message.loading(`Running analysis for ${name.value}...`, 0);
  
  try {
    const response = await axios.post(`${API_URL}/analyze`, {
      file_path: wavePath.value,
      transform_code: transformCode.value,
      sample_rate: sampleRate.value
    });

    if (response.data.status === 'success') {
      message.destroy();
      message.success(`Analysis for ${name.value} completed!`);
      errorMessage.value = '';
      
      // Update history/table data
      const payload = response.data?.data;
      if (payload && Array.isArray(payload)) {
        const newHistory: any[] = [];
        payload.forEach((row: any, index: number) => {
          const step = String(row?.timestamp ?? index);
          const entry: Record<string, number | string> = { step };
          Object.keys(row ?? {}).forEach((key) => {
            if (key === 'timestamp') return;
            const numericValue = Number(row[key]);
            if (Number.isFinite(numericValue)) entry[key] = numericValue;
          });
          newHistory.push(entry);
        });
        updateContext({ history: newHistory });
      } else if (payload && payload.timestamps && payload.values) {
        const timestamps: any[] = payload.timestamps;
        const valuesObj: Record<string, any[]> = payload.values;
        const len = Array.isArray(timestamps) ? timestamps.length : 0;
        const keys = Object.keys(valuesObj ?? {});
        const newHistory: any[] = [];
        for (let i = 0; i < len; i++) {
          const entry: Record<string, number | string> = { step: String(timestamps[i]) };
          keys.forEach((k) => {
            const v = Number(valuesObj[k]?.[i]);
            if (Number.isFinite(v)) entry[k] = v;
          });
          newHistory.push(entry);
        }
        updateContext({ history: newHistory });
      }
      
    } else {
      message.destroy();
      const backendError = response.data?.error ?? 'Unknown error';
      errorMessage.value = String(backendError);
      message.error(`Error: ${backendError}`);
    }
  } catch (error: any) {
    message.destroy();
    const backendError =
      error?.response?.data?.detail ??
      error?.response?.data?.error ??
      error?.message ??
      'Unknown error';
    errorMessage.value = String(backendError);
    message.error(`Request failed: ${backendError}`);
  }
};

defineExpose({
  runAnalysis
});

const expanded = ref(false);
const showTimeline = ref(false);
const chartRef = ref<HTMLElement | null>(null);
const isDark = ref(false);
const isSettingZoom = ref(false);
const transformEditorHeight = ref(120);
let chartInstance: echarts.ECharts | null = null;


// Resize logic
const startResize = (e: MouseEvent) => {
  const startY = e.clientY;
  const startHeight = transformEditorHeight.value;

  const onMouseMove = (ev: MouseEvent) => {
    const delta = ev.clientY - startY;
    const newHeight = Math.max(50, startHeight + delta); // Min height 50px
    transformEditorHeight.value = newHeight;
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

const extensions = computed(() => {
  return isDark.value ? [python(), oneDark] : [python()];
});

const calculateSummary = (
  history: Array<{ step: string | number; [key: string]: any }>,
  summaryType: string
): number | Record<string, number> | undefined => {
  if (!history.length) return undefined;
  const keys = Object.keys(history[0] ?? {}).filter(k => k !== 'step');
  if (!keys.length) return undefined;

  const summarize = (values: number[]): number | undefined => {
    if (!values.length) return undefined;
    if (summaryType === 'max') return Math.max(...values);
    if (summaryType === 'min') return Math.min(...values);
    if (summaryType === 'sum') return values.reduce((acc, val) => acc + val, 0);
    const total = values.reduce((acc, val) => acc + val, 0);
    return total / values.length;
  };

  const result: Record<string, number> = {};
  keys.forEach((key) => {
    const values = history
      .map(item => Number(item[key]))
      .filter(val => Number.isFinite(val));
    const summaryValue = summarize(values);
    if (summaryValue !== undefined) {
      result[key] = summaryValue;
    }
  });

  if (keys.length === 1) {
    const singleKey = keys[0];
    if (!singleKey) return undefined;
    return result[singleKey];
  }

  return Object.keys(result).length ? result : undefined;
};

const getVisibleHistory = (
  history: Array<{ step: string | number; [key: string]: any }> = historyData.value,
  zoomStart: number = zoomStartValue.value,
  zoomEnd: number = zoomEndValue.value
) => {
  const length = history.length;
  if (!length) return [];
  const startIndex = Math.max(
    0,
    Math.min(length - 1, Math.floor((zoomStart / 100) * (length - 1)))
  );
  const endIndex = Math.max(
    startIndex,
    Math.min(length - 1, Math.ceil((zoomEnd / 100) * (length - 1)))
  );
  return history.slice(startIndex, endIndex + 1);
};

// Initialize Chart
const baselineChartRef = ref<HTMLElement | null>(null);
let baselineChartInstance: echarts.ECharts | null = null;

const buildChartOption = (
  history: Array<{ step: string | number; [key: string]: any }>,
  chartType: string,
  zoomStart: number,
  zoomEnd: number,
  showSlider: boolean,
  userMaxValue?: number
): echarts.EChartsOption => {
  const textColor = isDark.value ? '#a0a0a0' : '#666';
  const axisColor = isDark.value ? '#404040' : '#e0e0e0';
  const steps = history.map(item => String(item.step));
  const keys = Object.keys(history[0] ?? {}).filter(k => k !== 'step');
  const gridBottom = showSlider ? '20%' : '8%';
  const dataZoom: echarts.DataZoomComponentOption[] = [
    {
      type: 'inside',
      xAxisIndex: 0,
      start: zoomStart,
      end: zoomEnd
    }
  ];
  if (showSlider) {
    dataZoom.push({
      type: 'slider',
      xAxisIndex: 0,
      height: '10%',
      bottom: '2%',
      start: zoomStart,
      end: zoomEnd
    });
  }
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: {
      top: '6%',
      bottom: gridBottom,
      left: '6%',
      right: '6%',
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
      data: steps,
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: isDark.value ? '#333' : '#eee' } },
      max: Number.isFinite(userMaxValue) ? Math.max(1, Number(userMaxValue)) : undefined
    },
    dataZoom,
    series: []
  };

  if (chartType === 'heatmap') {
    const yCategories = keys;
    const heatmapData: Array<[number, number, number]> = [];
    let maxValue = 0;
    yCategories.forEach((key, yIndex) => {
      history.forEach((item, xIndex) => {
        const rawValue = Number(item[key] ?? 0);
        const value = Number.isFinite(rawValue) ? rawValue : 0;
        maxValue = Math.max(maxValue, value);
        heatmapData.push([xIndex, yIndex, value]);
      });
    });
    option.xAxis = {
      type: 'category',
      data: steps,
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor }
    };
    option.yAxis = {
      type: 'category',
      data: yCategories,
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor }
    };
    const effectiveMax = Number.isFinite(userMaxValue) ? Number(userMaxValue) : maxValue;
    option.visualMap = {
      min: 0,
      max: Math.max(1, effectiveMax),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      top: 0,
      textStyle: { color: textColor }
    };
    option.series = [
      {
        type: 'heatmap',
        data: heatmapData,
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } }
      }
    ] as echarts.SeriesOption[];
  } else {
    const isStacked = chartType === 'stacked_bar' || chartType === 'stacked_line';
    const seriesType = chartType.includes('bar') ? 'bar' : 'line';
    const series = keys.map(key => {
      const data = history.map(item => item[key]);
      if (seriesType === 'line') {
        const lineItem: echarts.LineSeriesOption = {
          name: key,
          data,
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: { opacity: 0.1 }
        };
        if (isStacked) {
          lineItem.stack = 'total';
        }
        return lineItem;
      }
      const barItem: echarts.BarSeriesOption = {
        name: key,
        data,
        type: 'bar'
      };
      if (isStacked) {
        barItem.stack = 'total';
      }
      return barItem;
    });
    option.series = series as echarts.SeriesOption[];
  }
  return option;
};

const initCharts = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
    chartInstance.on('datazoom', handleMainDataZoom);
  }
  if (hasBaselineComparison.value && baselineChartRef.value) {
    baselineChartInstance = echarts.init(baselineChartRef.value);
    baselineChartInstance.on('datazoom', handleBaselineDataZoom);
  }
  updateCharts();
};

const updateCharts = () => {
  if (!chartInstance && !baselineChartInstance) return;
  const zoomStart = zoomStartValue.value;
  const zoomEnd = zoomEndValue.value;
  const baselineStart = baselineZoomStart.value;
  const baselineEnd = baselineZoomEnd.value;
  const chartType = coreModel.value.chartType ?? 'line';
  if (chartInstance) {
    if (historyData.value.length) {
      const option = buildChartOption(historyData.value, chartType, zoomStart, zoomEnd, true, coreModel.value.maxValue);
      isSettingZoom.value = true;
      chartInstance.setOption(option);
      setTimeout(() => {
        isSettingZoom.value = false;
      }, 0);
    } else {
      chartInstance.clear();
    }
  }
  if (baselineChartInstance) {
    if (baselineHistoryData.value.length) {
      const option = buildChartOption(baselineHistoryData.value, chartType, baselineStart, baselineEnd, true, coreModel.value.maxValue);
      isSettingZoom.value = true;
      baselineChartInstance.setOption(option);
      setTimeout(() => {
        isSettingZoom.value = false;
      }, 0);
    } else {
      baselineChartInstance.clear();
    }
  }
};

const handleMainDataZoom = (event: any) => {
  if (isSettingZoom.value) return;
  const payload = event?.batch?.[0] ?? event ?? {};
  const start = typeof payload.start === 'number' ? payload.start : zoomStartValue.value;
  const end = typeof payload.end === 'number' ? payload.end : zoomEndValue.value;
  zoomStartValue.value = start;
  zoomEndValue.value = end;
};

const handleBaselineDataZoom = (event: any) => {
  if (isSettingZoom.value) return;
  const payload = event?.batch?.[0] ?? event ?? {};
  const start = typeof payload.start === 'number' ? payload.start : baselineZoomStart.value;
  const end = typeof payload.end === 'number' ? payload.end : baselineZoomEnd.value;
  baselineZoomStart.value = start;
  baselineZoomEnd.value = end;
};

// Watch theme changes
let observer: MutationObserver | null = null;

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');

  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        isDark.value = document.documentElement.classList.contains('dark');
        if (showTimeline.value) {
           updateCharts();
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
    initCharts();
  } else {
    if (chartInstance) {
      chartInstance.dispose();
      chartInstance = null;
    }
    if (baselineChartInstance) {
      baselineChartInstance.dispose();
      baselineChartInstance = null;
    }
  }
});

watch(historyData, () => {
  if (showTimeline.value) {
    updateCharts();
  }
}, { deep: true });

watch(
  [zoomStartValue, zoomEndValue, baselineZoomStart, baselineZoomEnd, () => coreModel.value.chartType],
  () => {
  if (showTimeline.value) {
    updateCharts();
  }
});

watch([baselineHistoryData, hasBaselineComparison], () => {
  if (showTimeline.value) {
    if (chartInstance) {
      chartInstance.dispose();
      chartInstance = null;
    }
    if (baselineChartInstance) {
      baselineChartInstance.dispose();
      baselineChartInstance = null;
    }
    nextTick().then(() => {
      initCharts();
    });
  }
}, { deep: true });

// Handle Resize
const handleResize = () => {
  chartInstance?.resize();
  baselineChartInstance?.resize();
};

window.addEventListener('resize', handleResize);

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
  baselineChartInstance?.dispose();
  observer?.disconnect();
});
</script>
