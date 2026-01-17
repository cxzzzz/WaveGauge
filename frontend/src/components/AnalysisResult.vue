<template>
  <div class="analysis-result">
    <!-- Scalar/Simple Result -->
    <div v-if="isSimple" class="simple-result">
      <div v-if="typeof data === 'number'">
        <a-statistic title="Value" :value="data" :precision="4" />
        <a-progress v-if="data >= 0 && data <= 1" :percent="Math.round(data * 100)" />
      </div>
      <div v-else-if="Array.isArray(data)" style="height: 400px">
        <div ref="chartRef" style="width: 100%; height: 100%"></div>
      </div>
      <pre v-else>{{ JSON.stringify(data, null, 2) }}</pre>
    </div>

    <!-- Structured Dashboard (Nsight Style) -->
    <div v-else class="dashboard-result">
      <a-collapse v-model:activeKey="activeKeys" :bordered="false" style="background: transparent">
        <template #expandIcon="{ isActive }">
          <caret-right-outlined :rotate="isActive ? 90 : 0" />
        </template>
        
        <a-collapse-panel v-for="(section, key) in sections" :key="key" :style="panelStyle">
          <template #header>
            <span class="panel-title">{{ section.title || key }}</span>
          </template>
          
          <div class="panel-content">
            <!-- Description -->
            <p v-if="section.description" class="section-desc">{{ section.description }}</p>

            <!-- Metrics Grid -->
            <div v-if="section.metrics" class="metrics-grid">
              <a-row :gutter="48">
                <!-- Split metrics into two columns -->
                <a-col :span="12">
                   <div v-for="(val, label) in getLeftMetrics(section.metrics)" :key="label" class="metric-row">
                     <span class="metric-label">{{ label }}</span>
                     <span class="metric-value">{{ formatValue(val) }}</span>
                   </div>
                </a-col>
                <a-col :span="12">
                   <div v-for="(val, label) in getRightMetrics(section.metrics)" :key="label" class="metric-row">
                     <span class="metric-label">{{ label }}</span>
                     <span class="metric-value">{{ formatValue(val) }}</span>
                   </div>
                </a-col>
              </a-row>
            </div>

            <!-- Warnings/Alerts -->
            <div v-if="section.warnings" class="warnings-section">
              <div v-for="(warn, idx) in section.warnings" :key="idx" class="warning-item">
                <div class="warning-icon"><warning-outlined /></div>
                <div class="warning-content">
                  <div class="warning-title">{{ warn.title }}</div>
                  <div class="warning-msg">{{ warn.message }}</div>
                </div>
              </div>
            </div>

            <!-- Charts -->
             <div v-if="section.charts" class="charts-section">
                <div v-for="(chartData, chartTitle) in section.charts" :key="chartTitle" class="chart-container">
                   <h4>{{ chartTitle }}</h4>
                   <div :ref="(el) => setChartRef(el, chartTitle)" style="width: 100%; height: 300px"></div>
                </div>
             </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { CaretRightOutlined, WarningOutlined } from '@ant-design/icons-vue';
import * as echarts from 'echarts';

const props = defineProps<{
  data: any;
}>();

const activeKeys = ref<string[]>([]);
const chartRefs = ref<Record<string, HTMLElement>>({});
const chartInstances: Record<string, echarts.ECharts> = {};

// Helpers
const isSimple = computed(() => {
  if (!props.data) return true;
  if (typeof props.data !== 'object') return true;
  if (Array.isArray(props.data)) return true;
  // Check if it matches our "Section" schema (has title/metrics keys)
  // Or is a dict of such sections
  const keys = Object.keys(props.data);
  if (keys.length === 0) return true;
  // Heuristic: If values are objects with 'metrics', it's a dashboard
  const firstVal = props.data[keys[0]];
  return !(firstVal && typeof firstVal === 'object' && 'metrics' in firstVal);
});

const sections = computed(() => {
  if (isSimple.value) return {};
  return props.data;
});

// Initialize active keys to all sections
watch(sections, (newVal) => {
  if (newVal) {
    activeKeys.value = Object.keys(newVal);
    nextTick(renderCharts);
  }
}, { immediate: true });

const panelStyle = {
  marginBottom: '16px',
  background: '#1e1e1e',
  borderRadius: '4px',
  border: 'none',
  overflow: 'hidden',
};

const formatValue = (val: any) => {
  if (typeof val === 'number') {
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return val;
};

// Split metrics for 2-column layout
const getLeftMetrics = (metrics: Record<string, any>) => {
  const entries = Object.entries(metrics);
  const half = Math.ceil(entries.length / 2);
  return Object.fromEntries(entries.slice(0, half));
};

const getRightMetrics = (metrics: Record<string, any>) => {
  const entries = Object.entries(metrics);
  const half = Math.ceil(entries.length / 2);
  return Object.fromEntries(entries.slice(half));
};

// Chart Handling
const setChartRef = (el: any, key: string) => {
  if (el) chartRefs.value[key] = el;
};

const renderCharts = () => {
  // Dispose old
  Object.values(chartInstances).forEach(inst => inst.dispose());
  
  // Create new
  if (!isSimple.value) {
    Object.entries(sections.value).forEach(([secKey, section]: [string, any]) => {
      if (section.charts) {
        Object.entries(section.charts).forEach(([chartKey, chartData]: [string, any]) => {
           const el = chartRefs.value[chartKey];
           if (el && Array.isArray(chartData)) {
             const inst = echarts.init(el, 'dark');
             inst.setOption({
               backgroundColor: 'transparent',
               tooltip: { trigger: 'axis' },
               xAxis: { type: 'category', data: chartData.map((_, i) => i) },
               yAxis: { type: 'value' },
               series: [{ data: chartData, type: 'line' }]
             });
             chartInstances[chartKey] = inst;
           }
        });
      }
    });
  } else if (Array.isArray(props.data)) {
      // Simple array chart logic here if needed (reusing old logic or moving it)
  }
};

const handleResize = () => Object.values(chartInstances).forEach(inst => inst.resize());

onMounted(() => window.addEventListener('resize', handleResize));
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  Object.values(chartInstances).forEach(inst => inst.dispose());
});

</script>

<style scoped>
/* Nsight Dark Theme Styles */
.dashboard-result {
  background: #2d2d2d;
  padding: 10px;
  color: #e0e0e0;
}

:deep(.ant-collapse-header) {
  background: #333 !important;
  color: #fff !important;
  font-weight: bold;
  border-bottom: 1px solid #444;
}

:deep(.ant-collapse-content) {
  background: #1e1e1e !important;
  color: #ccc;
  border-top: none;
}

.section-desc {
  color: #aaa;
  margin-bottom: 15px;
  font-size: 13px;
}

.metrics-grid {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid #333;
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-label {
  color: #ccc;
}

.metric-value {
  color: #fff;
  font-weight: 500;
  font-family: monospace;
}

.warnings-section {
  margin-top: 20px;
  border-left: 3px solid #faad14;
  background: #333300;
  padding: 10px;
}

.warning-item {
  display: flex;
  gap: 10px;
}

.warning-icon {
  color: #faad14;
  font-size: 16px;
  margin-top: 2px;
}

.warning-title {
  font-weight: bold;
  color: #fff;
}

.warning-msg {
  color: #ddd;
}

.charts-section {
  margin-top: 20px;
}
</style>
