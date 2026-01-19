<template>
  <a-tabs
    v-model:activeKey="activeTabId"
    type="editable-card"
    size="small"
    :hide-add="false"
    @edit="handleTabEdit"
  >
    <a-tab-pane
      v-for="tab in waveformTabs"
      :key="tab.id"
      :closable="false"
    >
      <template #tab>
        <span class="inline-flex items-center gap-1">
          <span>{{ tabNames[tab.id] }}</span>
          <a-tag v-if="baselineTabId === tab.id" color="blue" class="!text-[10px] !px-1 !py-0">
            BL
          </a-tag>
        </span>
      </template>
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs text-gray-600 dark:text-[#a0a0a0] whitespace-nowrap">Waveform Path</span>
        <a-input
          v-model:value="tab.path"
          size="small"
          placeholder="Enter waveform file path"
          class="!text-xs"
        />
        <a-button size="small" @click="toggleBaseline(tab.id)">
          {{ baselineTabId === tab.id ? 'Unset' : 'Set Baseline' }}
        </a-button>
      </div>
      <AnalysisGroup 
        :element="tab.rootGroup" 
        :is-root="true"
        :wave-path="tab.path"
        :baseline-map="baselineMap"
        :group-path="''"
        :is-baseline="baselineTabId === tab.id"
        v-model:zoomStart="tab.zoomStart"
        v-model:zoomEnd="tab.zoomEnd"
      />
    </a-tab-pane>
  </a-tabs>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AnalysisGroup from './AnalysisGroup.vue';

type WaveformTab = {
  id: string;
  path: string;
  rootGroup: any;
  zoomStart: number;
  zoomEnd: number;
};

const createRootGroup = () => ({
  id: 'root',
  type: 'group',
  name: '',
  collapsed: false,
  children: [
    {
      id: 'g1',
      type: 'group',
      name: 'GPU Performance Analysis',
      collapsed: false,
      children: [
        {
          id: 'a1',
          type: 'analysis',
          name: 'Compute (SM) Throughput [%]',
          metricCode: '# Calculate SM Throughput\n# Return a single value (0-1)\nnp.mean(data["sm_active"])',
          transformCode: '# Load waveform\nsm = W(\'top.sm_active\', clock=\'top.clk\')\ndata = pd.DataFrame({\n  "sm_active": sm.value\n})',
          chartType: 'line',
          summaryType: 'avg',
          maxValue: undefined
        },
        {
          id: 'g2',
          type: 'group',
          name: 'Memory Subsystem',
          collapsed: false,
          children: [
            {
              id: 'a2',
              type: 'analysis',
              name: 'Memory Throughput [%]',
              metricCode: '# Calculate Memory Throughput\n# Return a single value (0-1)\nnp.mean(data["dram_read"] + data["dram_write"]) / 100',
              transformCode: '# Load waveforms\nwaves = WS([\'top.dram_read\', \'top.dram_write\'], clock=\'top.clk\')\nread = waves[0]\nwrite = waves[1]\ndata = pd.DataFrame({\n  "dram_read": read.value,\n  "dram_write": write.value\n})',
              chartType: 'bar',
              summaryType: 'avg',
              maxValue: undefined
            },
            {
              id: 'a3',
              type: 'analysis',
              name: 'L2 Cache Breakdown',
              metricCode: '# Calculate L2 Cache Metrics\n{\n  "L2 Hit Rate": np.mean(data["l2_hit"]),\n  "L2 Throughput": 0.45,\n  "L2 Write Hit Rate": 0.92\n}',
              transformCode: '# Load waveform\nl2 = W(\'top.l2_hit\', clock=\'top.clk\')\ndata = pd.DataFrame({\n  "l2_hit": l2.value\n})',
              chartType: 'heatmap',
              summaryType: 'avg',
              maxValue: undefined
            }
          ]
        }
      ]
    }
  ]
});

const waveformTabs = ref<WaveformTab[]>([
  {
    id: 'waveform-1',
    path: '/home/cxzzzz/Programming/hardware/WaveGauge/backend/sample.vcd',
    rootGroup: createRootGroup(),
    zoomStart: 0,
    zoomEnd: 100
  }
]);
const activeTabId = ref('waveform-1');
const nextTabIndex = ref(2);
const baselineTabId = ref('waveform-1');

const getBaseName = (path: string) => {
  const fileName = path.split('/').pop() ?? '';
  const base = fileName.replace(/\.[^/.]+$/, '');
  return base || 'Waveform';
};

const tabNames = computed(() => {
  const counts: Record<string, number> = {};
  const result: Record<string, string> = {};
  waveformTabs.value.forEach((tab) => {
    const base = getBaseName(tab.path);
    const count = counts[base] ?? 0;
    counts[base] = count + 1;
    result[tab.id] = count === 0 ? base : `${base}-${count}`;
  });
  return result;
});

const buildGroupPath = (parentPath: string, groupName: string) => {
  if (!groupName) return parentPath;
  return parentPath ? `${parentPath}/${groupName}` : groupName;
};

const buildSignature = (groupPath: string, analysisName: string) => {
  return groupPath ? `${groupPath}/${analysisName}` : analysisName;
};

const baselineMap = computed(() => {
  const baselineTab = waveformTabs.value.find(tab => tab.id === baselineTabId.value);
  if (!baselineTab) return {};
  const map: Record<string, { result: any; history: any[] | undefined }> = {};

  const walk = (node: any, path: string) => {
    if (node?.type === 'group') {
      const nextPath = buildGroupPath(path, node.name ?? '');
      (node.children ?? []).forEach((child: any) => walk(child, nextPath));
      return;
    }
    if (node?.type === 'analysis') {
      const signature = buildSignature(path, node.name ?? '');
      map[signature] = { result: node.result, history: node.history };
    }
  };

  walk(baselineTab.rootGroup, '');
  return map;
});

const addWaveformTab = () => {
  const id = `waveform-${nextTabIndex.value}`;
  nextTabIndex.value += 1;
  waveformTabs.value.push({
    id,
    path: '',
    rootGroup: createRootGroup(),
    zoomStart: 0,
    zoomEnd: 100
  });
  activeTabId.value = id;
};

const handleTabEdit = (_targetKey: string | MouseEvent, action: 'add' | 'remove') => {
  if (action === 'add') {
    addWaveformTab();
  }
};

const toggleBaseline = (tabId: string) => {
  baselineTabId.value = baselineTabId.value === tabId ? '' : tabId;
};
</script>
