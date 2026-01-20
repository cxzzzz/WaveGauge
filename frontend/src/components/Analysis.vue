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
                  {{ expanded ? 'Hide Settings' : 'Show Settings' }}
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

    <div v-if="showTimeline" class="p-1.5 bg-white dark:bg-[#1f1f1f] border-t border-gray-100 dark:border-[#2a2a2a] transition-colors duration-300">
      <div v-if="hasBaselineComparison" class="w-full aspect-[16/5] grid grid-rows-2 gap-1">
        <div ref="chartRef" class="w-full h-full"></div>
        <div ref="baselineChartRef" class="w-full h-full"></div>
      </div>
      <div v-else ref="chartRef" class="w-full aspect-[16/5]"></div>
    </div>

    <!-- Body: Logic Editor (Collapsible) -->
    <div v-if="expanded" class="p-2 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#303030] transition-colors duration-300">
      <div class="mb-2 flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Chart Type
          </div>
          <a-select
            :value="chartTypeValue"
            size="small"
            class="!text-xs w-[160px]"
            :options="chartTypeOptions"
            @update:value="updateCore({ chartType: $event })"
          />
        </div>
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Data Summary
          </div>
          <a-select
            :value="summaryTypeValue"
            size="small"
            class="!text-xs w-[140px]"
            :options="summaryTypeOptions"
            @update:value="updateCore({ summaryType: $event })"
          />
        </div>
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Max Value
          </div>
          <a-input-number
            :value="maxValueValue"
            size="small"
            :min="0"
            :step="0.01"
            class="!text-xs w-[120px]"
            placeholder="Auto"
            @update:value="updateCore({ maxValue: $event === null ? Number.NaN : Number($event) })"
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted, toRef, unref } from 'vue';
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
import { useAnalysisStore, type ZoomRange } from '../stores/analysis';

const API_URL = 'http://localhost:8000/api';
const SINGLE_VALUE_KEY = '__single__';
const MIN_EDITOR_HEIGHT = 50;

type AnalysisCore = {
  name: string;
  transformCode: string;
  description: string;
  chartType: string;
  summaryType: string;
  maxValue: number;
};

type History = {
  timestamps: Array<number>;
  values: Record<string, number[]>;
};

type AnalysisContext = {
  history: History;
  baselineHistory: History;
  tabId: string;
};

const props = defineProps<{
  core: AnalysisCore;
  context: AnalysisContext;
}>();

const emit = defineEmits<{
  (e: 'update:core', val: AnalysisCore): void;
  (e: 'update:context', val: AnalysisContext): void;
  (e: 'delete'): void;
}>();

const updateCore = (patch: Partial<AnalysisCore>) => {
  emit('update:core', { ...props.core, ...patch });
};
const updateContext = (patch: Partial<AnalysisContext>) => {
  emit('update:context', { ...props.context, ...patch });
};
const name = computed(() => props.core.name);
const description = computed(() => props.core.description);
const transformCode = computed(() => props.core.transformCode);
const isEditingName = ref(false);
const localName = ref(props.core.name);
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
const chartTypeValue = computed(() => props.core.chartType);
const summaryTypeValue = computed(() => props.core.summaryType);
const maxValueValue = computed(() => props.core.maxValue);

const historyData = computed(() => props.context.history);
const analysisStore = useAnalysisStore();
const tabId = computed(() => props.context.tabId);
const tabState = toRef(analysisStore.tabs, tabId.value);
const zoomRange = toRef(tabState.value, 'zoom');

const visibleHistory = computed(() => getVisibleHistory(historyData.value, zoomRange.value));
const summaryValues = computed(() => calculateSummary(visibleHistory.value, summaryTypeValue.value));
const wavePath = computed<string>(() => {
  return tabState.value.wavePath;
});
const sampleRate = computed<number>(() => {
  return tabState.value.sampleRate;
});
const isBaseline = computed(() => {
  return analysisStore.baselineTabId === tabId.value;
});

const isMultiValue = ref(false);

const hasBaselineComparison = computed(() => {
  if (isBaseline.value) return false;
  return baselineHistoryData.value.timestamps.length > 0;
});
const baselineHistoryData = computed(() => props.context.baselineHistory);
const baselineZoomRange = ref<ZoomRange>({start: 0, end: Number.MIN_SAFE_INTEGER});
const baselineVisibleHistory = computed(() => {
  return getVisibleHistory(baselineHistoryData.value, baselineZoomRange.value);
});
const baselineSummaryValues = computed(() => calculateSummary(
  baselineVisibleHistory.value,
  summaryTypeValue.value
));

const getMaxFromHistory = (history: History, key: string) => {
  let maxVal = 0;
  history.values[key]!.forEach((item) => {
    const value = Number(item);
    if (Number.isFinite(value) && value > maxVal) {
      maxVal = value;
    }
  });
  return maxVal;
};

const getMaxForKey = (key: string) => {
  if (Number.isFinite(props.core.maxValue)) return props.core.maxValue;
  return getMaxFromHistory(visibleHistory.value, key);
};

const effectiveMax = computed(() => {
  if (Number.isFinite(props.core.maxValue)) return props.core.maxValue;
  const keys = Object.keys(visibleHistory.value.values);
  if (keys.length !== 1) return 0;
  const key = keys[0];
  if (!key) return 0;
  return getMaxFromHistory(visibleHistory.value, key);
});

const getMaxValueForDisplay = (key: string) => {
  if (key === SINGLE_VALUE_KEY) return Number(effectiveMax.value) || 0;
  return Number(getMaxForKey(key)) || 0;
};

const getBaselineValueForKey = (key: string) => {
  if (!hasBaselineComparison.value) return Number.NaN;
  return baselineSummaryValues.value[key]!;
};

type DisplayItem = {
  key: string;
  label: string;
  currentValue: number;
  baselineValue: number;
  maxValue: number;
  hasBaseline: boolean;
};

const displayItems = computed<DisplayItem[]>(() => {
  return Object.keys(summaryValues.value).map((key) => {
    const currentValue = Number(summaryValues.value[key]);
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
  nameInput.value!.focus();
};

const saveName = () => {
  isEditingName.value = false;
  if (localName.value !== name.value) {
    updateCore({ name: localName.value });
  }
};

const applyBackendError = (backendError: unknown, prefix: string) => {
  const messageText = String(backendError);
  errorMessage.value = messageText;
  message.error(`${prefix}: ${messageText}`);
};

const runAnalysis = async () => {
  errorMessage.value = '';
  if (!wavePath.value.trim()) {
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

      const payload = response.data.data as {
        timestamps: Array<number>;
        values: Record<string, number[]> | number[];
      };
      isMultiValue.value = !Array.isArray(payload.values);
      const valuesMap = Array.isArray(payload.values) ? { [SINGLE_VALUE_KEY]: payload.values } : payload.values;
      const newHistory: History = { timestamps: payload.timestamps, values: valuesMap };
      updateContext({ history: newHistory });
    } else {
      message.destroy();
      const backendError = response.data.error;
      applyBackendError(backendError, 'Error');
    }
  } catch (error: any) {
    message.destroy();
    const backendError = error.response.data.detail;
    applyBackendError(backendError, 'Request failed');
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
    const newHeight = Math.max(MIN_EDITOR_HEIGHT, startHeight + delta);
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
  history: History,
  summaryType: string
): Record<string, number> => {
  const keys = Object.keys(history.values);

  const summarize = (values: number[]): number => {
    const numericValues = values.map(Number).filter(Number.isFinite);
    if (!numericValues.length) return Number.NaN;
    if (summaryType === 'max') return Math.max(...numericValues);
    if (summaryType === 'min') return Math.min(...numericValues);
    if (summaryType === 'sum') return numericValues.reduce((acc, val) => acc + val, 0);
    const total = numericValues.reduce((acc, val) => acc + val, 0);
    return total / numericValues.length;
  };

  return Object.fromEntries(
    keys.map(key => [key, summarize(history.values[key]!)])
  );
};

const getVisibleHistory = (
  history: History = historyData.value,
  zoomRange: ZoomRange
) => {
  const length = history.timestamps.length;
  if (!length) return { timestamps: [], values: {} };
  const startIndex = Math.max(
    0,
    Math.min(length - 1, Math.floor((zoomRange.start / 100) * (length - 1)))
  );
  const endIndex = Math.max(
    startIndex,
    Math.min(length - 1, Math.ceil((zoomRange.end / 100) * (length - 1)))
  );
  const timestamps = history.timestamps.slice(startIndex, endIndex + 1);
  const values: Record<string, number[]> = {};
  Object.keys(history.values).forEach((key) => {
    values[key] = history.values[key]!.slice(startIndex, endIndex + 1);
  });
  return { timestamps, values };
};

// Initialize Chart
const baselineChartRef = ref<HTMLElement | null>(null);
let baselineChartInstance: echarts.ECharts | null = null;
let resizeBound = false;

const buildChartOption = (
  history: History,
  chartType: string,
  zoomRange: ZoomRange,
  userMaxValue: number 
): echarts.EChartsOption => {
  const textColor = isDark.value ? '#a0a0a0' : '#666';
  const axisColor = isDark.value ? '#404040' : '#e0e0e0';
  const steps = history.timestamps.map(item => String(item));
  const keys = Object.keys(history.values);
  const gridBottom = '20%' 

  const realZoomRange = {
    start: zoomRange.start,
    end: zoomRange.end === Number.MAX_SAFE_INTEGER ? undefined : zoomRange.end
  }
  const dataZoom: echarts.DataZoomComponentOption[] = [
    {
      type: 'inside',
      xAxisIndex: 0,
      start: realZoomRange.start,
      end: realZoomRange.end
    }, {
      type: 'slider',
      xAxisIndex: 0,
      height: '10%',
      bottom: '2%',
      start: realZoomRange.start,
      end: realZoomRange.end
    }
  ];

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
      max: Number.isFinite(userMaxValue) ? userMaxValue : undefined
    },
    dataZoom,
    series: []
  };

  if (chartType === 'heatmap') {
    const yCategories = keys;
    const heatmapData: Array<[number, number, number]> = [];
    let maxValue = 0;
    yCategories.forEach((key, yIndex) => {
      steps.forEach((_, xIndex) => {
        const rawValue = Number(history.values[key]![xIndex]);
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
      const data = steps.map((_, index) => history.values[key]![index]);
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

const createChartInstance = (
  target: HTMLElement,
  onZoom: (event: any) => void
) => {
  const instance = echarts.init(target);
  instance.on('datazoom', onZoom);
  return instance;
};

const disposeCharts = () => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  if (baselineChartInstance) {
    baselineChartInstance.dispose();
    baselineChartInstance = null;
  }
};

const applyChartOption = (
  instance: echarts.ECharts,
  history: History,
  zoomRange: ZoomRange
) => {
  const option = buildChartOption(
    history,
    chartTypeValue.value,
    zoomRange,
    maxValueValue.value
  );
  isSettingZoom.value = true;
  instance.setOption(option);
  setTimeout(() => {
    isSettingZoom.value = false;
  }, 0);
};

const initCharts = () => {
  chartInstance = createChartInstance(chartRef.value!, 
    (event: any) => updateZoomFromEvent(event, zoomRange));
  if (hasBaselineComparison.value) {
    baselineChartInstance = createChartInstance(baselineChartRef.value!, 
    (event: any) => updateZoomFromEvent(event, baselineZoomRange));
  }
  if (!resizeBound) {
    window.addEventListener('resize', handleResize);
    resizeBound = true;
  }
  updateCharts();
};

const updateCharts = () => {
  applyChartOption(chartInstance!, historyData.value, zoomRange.value);
  if (hasBaselineComparison.value) {
    applyChartOption(baselineChartInstance!, baselineHistoryData.value, baselineZoomRange.value);
  }
};

const updateZoomFromEvent = (
  event: { start: number, end: number },
  zoomRangeRef: { value: ZoomRange },
) => {
  if (isSettingZoom.value) return;
  zoomRangeRef.value.start = event.start;
  zoomRangeRef.value.end = event.end;
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
    disposeCharts();
  }
});

watch(
  [historyData, zoomRange, baselineZoomRange, chartTypeValue ],
  () => { 
    if (showTimeline.value) { updateCharts() } }
  , { deep: true }
);

watch([baselineHistoryData, hasBaselineComparison], () => {
  if (showTimeline.value) {
    disposeCharts();
    nextTick().then(() => {
      initCharts();
    });
  }
}, { deep: true });

// Handle Resize
const handleResize = () => {
  chartInstance!.resize();
  if (hasBaselineComparison.value) {
    baselineChartInstance!.resize();
  }
};

onUnmounted(() => {
  if (resizeBound) {
    window.removeEventListener('resize', handleResize);
  }
  disposeCharts();
  observer!.disconnect();
});
</script>
