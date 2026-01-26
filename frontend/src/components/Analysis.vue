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
        <template v-if="!isMultiseries">
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
          <a-tooltip title="Toggle Timeline">
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
          </a-tooltip>

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

          <!-- Run Analysis -->
          <a-tooltip title="Run Analysis">
            <a-button 
              type="text" 
              size="small" 
              class="inline-flex items-center justify-center !text-gray-500 hover:!text-green-600 dark:!text-gray-400 dark:hover:!text-green-400 !h-5 !w-5 !px-0 !leading-none"
              @click="runAnalysis"
            >
              <template #icon>
                <play-circle-outlined />
              </template>
            </a-button>
          </a-tooltip>

          <!-- Show/Hide Settings -->
          <a-tooltip :title="expanded ? 'Hide Settings' : 'Show Settings'">
            <a-button 
              type="text" 
              size="small" 
              class="inline-flex items-center justify-center !text-gray-500 hover:!text-blue-600 dark:!text-gray-400 dark:hover:!text-blue-400 !h-5 !w-5 !px-0 !leading-none"
              @click="expanded = !expanded"
            >
              <template #icon>
                <code-outlined v-if="!expanded" />
                <up-outlined v-else />
              </template>
            </a-button>
          </a-tooltip>

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
    <div v-if="isMultiseries" class="px-1.5 py-0.5 bg-white dark:bg-[#1f1f1f] border-t border-gray-100 dark:border-[#2a2a2a]">
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
            Analysis Type
          </div>
          <a-select
            :value="analysisType"
            size="small"
            class="!text-xs w-[140px]"
            :options="analysisTypeOptions"
            @update:value="handleAnalysisTypeChange($event)"
          />
        </div>
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted, toRef, inject } from 'vue';
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
import { message } from 'ant-design-vue';
import ProgressValueDisplay from './ProgressValueDisplay.vue';
import { useAnalysisStore, type ZoomRange } from '../stores/analysis';
import {
  analysisStrategyRegistryKey,
  type AnalysisStrategyRegistry,
  type AnalysisType
} from '../analysis/strategies';

const API_URL = '/api';
const MIN_EDITOR_HEIGHT = 50;

type AnalysisCore = {
  name: string;
  transformCode: string;
  description: string;
  chartType: string;
  summaryType: string;
  maxValue: number;
  analysisType?: AnalysisType;
};

type AnalysisContext = {
  data: unknown;
  isMultiseries?: boolean;
  baselineData: unknown;
  tabId: string;
};

const props = defineProps<{
  core: AnalysisCore;
  context: AnalysisContext;
  ancestorCollapsed?: boolean;
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
const analysisType = computed<AnalysisType>(() => props.core.analysisType ?? 'counter');
const chartTypeValue = computed(() => props.core.chartType);
const summaryTypeValue = computed(() => props.core.summaryType);
const maxValueValue = computed(() => props.core.maxValue);

const dataModel = computed(() =>
  props.context.data ?? analysisStrategy.value.getEmptyData()
);
const analysisStore = useAnalysisStore();
const tabId = computed(() => props.context.tabId);
const tabState = toRef(analysisStore.tabs, tabId.value);
const zoomRange = toRef(tabState.value, 'zoom');
const strategyRegistry = inject(analysisStrategyRegistryKey) as AnalysisStrategyRegistry | undefined;
if (!strategyRegistry) {
  throw new Error('Analysis strategy registry is not provided');
}
const analysisStrategy = computed(() => strategyRegistry.getStrategy(analysisType.value));
const analysisTypeOptions = computed(() =>
  strategyRegistry.getTypes().map((type) => ({ label: type, value: type }))
);
const chartTypeOptions = computed(() => analysisStrategy.value.chartTypeOptions);
const summaryTypeOptions = computed(() => analysisStrategy.value.summaryTypeOptions);
const handleAnalysisTypeChange = (value: AnalysisType) => {
  const nextStrategy = strategyRegistry.getStrategy(value);
  const nextChartType = nextStrategy.chartTypeOptions[0]?.value ?? chartTypeValue.value;
  const nextSummaryType = nextStrategy.summaryTypeOptions[0]?.value ?? summaryTypeValue.value;
  updateCore({
    analysisType: value,
    chartType: nextChartType,
    summaryType: nextSummaryType
  });
};

const summaryValues = computed(() => {
  if (props.ancestorCollapsed) {
    return {};
  }
  return analysisStrategy.value.calculateSummary({
    data: dataModel.value,
    summaryType: summaryTypeValue.value,
    zoomRange: zoomRange.value
  });
});
const wavePath = computed<string>(() => {
  return tabState.value.wavePath;
});
const sampleRate = computed<number>(() => {
  return tabState.value.sampleRate;
});
const isBaseline = computed(() => {
  return analysisStore.baselineTabId === tabId.value;
});

const isMultiseries = computed(() => !!props.context.isMultiseries);

const hasBaselineComparison = computed(() => {
  if (isBaseline.value) return false;
  return baselineData.value !== null && baselineData.value !== undefined;
});
const baselineData = computed(() => props.context.baselineData);
const baselineZoomRange = ref<ZoomRange>({ start: 0, end: 100 });
const baselineSummaryValues = computed(() => {
  if (props.ancestorCollapsed) return {};
  if (!hasBaselineComparison.value) return {};
  return analysisStrategy.value.calculateSummary({
    data: baselineData.value,
    summaryType: summaryTypeValue.value,
    zoomRange: baselineZoomRange.value
  });
});

const displayMaxValues = computed(() => {
  if (props.ancestorCollapsed) return {};
  return analysisStrategy.value.getDisplayMaxValues({
    data: dataModel.value,
    summaryValues: summaryValues.value,
    userMaxValue: maxValueValue.value,
    zoomRange: zoomRange.value
  });
});

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
      maxValue: Number(displayMaxValues.value[key]),
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

const formatBackendError = (backendError: unknown) => {
  if (typeof backendError === 'string') return backendError;
  if (backendError instanceof Error) return backendError.message;
  if (backendError && typeof backendError === 'object') {
    try {
      return JSON.stringify(backendError);
    } catch {
      return String(backendError);
    }
  }
  return String(backendError);
};

const applyBackendError = (backendError: unknown, prefix: string) => {
  const messageText = formatBackendError(backendError);
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
    const result = await analysisStrategy.value.runAnalysis({
      apiUrl: API_URL,
      wavePath: wavePath.value,
      transformCode: transformCode.value,
      sampleRate: sampleRate.value
    });
    message.destroy();
    message.success(`Analysis for ${name.value} completed!`);
    errorMessage.value = '';
    updateContext({ data: result.data, isMultiseries: result.isMultiseries });
  } catch (error: any) {
    message.destroy();
    const backendError = error?.response?.data?.detail ?? error?.message ?? error;
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

// Initialize Chart
const baselineChartRef = ref<HTMLElement | null>(null);
let baselineChartInstance: echarts.ECharts | null = null;
let resizeBound = false;

const createChartInstance = (
  target: HTMLElement,
  zoomRangeRef: { value: ZoomRange }
) => {
  const instance = echarts.init(target);
  instance.on('datazoom', (event: any) => updateZoomFromEvent(event, zoomRangeRef, instance));
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
  data: unknown,
  zoomRange: ZoomRange
) => {
  const option = analysisStrategy.value.buildChartOption({
    data,
    chartType: chartTypeValue.value,
    zoomRange,
    userMaxValue: maxValueValue.value,
    isDark: isDark.value
  });
  isSettingZoom.value = true;
  instance.setOption(option);
  setTimeout(() => {
    isSettingZoom.value = false;
  }, 0);
};

const applyZoomAction = (instance: echarts.ECharts, zoomRange: ZoomRange) => {
  const start = zoomRange.start;
  const end = zoomRange.end;
  isSettingZoom.value = true;
  instance.dispatchAction({
    type: 'dataZoom',
    dataZoomIndex: 0,
    start,
    end
  });
  instance.dispatchAction({
    type: 'dataZoom',
    dataZoomIndex: 1,
    start,
    end
  });
  setTimeout(() => {
    isSettingZoom.value = false;
  }, 0);
};

const initCharts = () => {
  chartInstance = createChartInstance(chartRef.value!, zoomRange);
  if (hasBaselineComparison.value) {
    baselineChartInstance = createChartInstance(baselineChartRef.value!, baselineZoomRange);
  }
  if (!resizeBound) {
    window.addEventListener('resize', handleResize);
    resizeBound = true;
  }
  updateCharts();
};

const updateCharts = () => {
  if (props.ancestorCollapsed) return;
  applyChartOption(chartInstance!, dataModel.value, zoomRange.value);
  if (hasBaselineComparison.value && baselineData.value !== null && baselineData.value !== undefined) {
    applyChartOption(baselineChartInstance!, baselineData.value, baselineZoomRange.value);
  }
};

const updateZoomFromEvent = (
  event: any,
  zoomRangeRef: { value: ZoomRange },
  instance: echarts.ECharts
) => {
  if (isSettingZoom.value) return;
  const payload = Array.isArray(event?.batch) && event.batch.length ? event.batch[0] : event;
  const start = Number(payload?.start);
  const end = Number(payload?.end);
  if (Number.isFinite(start) && Number.isFinite(end)) {
    zoomRangeRef.value.start = start;
    zoomRangeRef.value.end = end;
    return;
  }
  const startValue = Number(payload?.startValue);
  const endValue = Number(payload?.endValue);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
    return;
  }
  const option = instance.getOption();
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
  const min = Number((xAxis as any)?.min);
  const max = Number((xAxis as any)?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return;
  }
  const range = max - min;
  const nextStart = ((startValue - min) / range) * 100;
  const nextEnd = ((endValue - min) / range) * 100;
  zoomRangeRef.value.start = Math.max(0, Math.min(100, nextStart));
  zoomRangeRef.value.end = Math.max(0, Math.min(100, nextEnd));
};

watch(() => props.ancestorCollapsed, (collapsed) => {
  if (!collapsed && showTimeline.value) {
    nextTick(() => {
      handleResize();
      updateCharts();
    });
  }
});

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

watch([zoomRange, baselineZoomRange], () => {
  if (props.ancestorCollapsed) return;
  if (!showTimeline.value) return;
  if (chartInstance) {
    applyZoomAction(chartInstance, zoomRange.value);
  }
  if (hasBaselineComparison.value && baselineChartInstance) {
    applyZoomAction(baselineChartInstance, baselineZoomRange.value);
  }
}, { deep: true });

watch(
  [dataModel, chartTypeValue, maxValueValue],
  ([newData, newType, newMax], [oldData, oldType, oldMax]) => {
    const isDataChanged = newData !== oldData;
    const isTypeChanged = newType !== oldType;
    const isMaxChanged = newMax !== oldMax && !(Number.isNaN(Number(newMax)) && Number.isNaN(Number(oldMax)));

    if (isDataChanged || isTypeChanged || isMaxChanged) {
      if (showTimeline.value) { updateCharts() } 
    }
  }
);

watch([baselineData, hasBaselineComparison], () => {
  if (showTimeline.value) {
    disposeCharts();
    nextTick().then(() => {
      initCharts();
    });
  }
});

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
