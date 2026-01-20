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
          <a-tag v-if="analysisStore.baselineTabId === tab.id" color="blue" class="!text-[10px] !px-1 !py-0">
            BL
          </a-tag>
        </span>
      </template>
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs text-gray-600 dark:text-[#a0a0a0] whitespace-nowrap">Waveform Path</span>
        <a-input
          :value="tabState(tab.id).wavePath"
          @update:value="tabState(tab.id).wavePath = $event"
          size="small"
          placeholder="Enter waveform file path"
          class="!text-xs"
        />
        <span class="text-xs text-gray-600 dark:text-[#a0a0a0] whitespace-nowrap">Sample Every (cycles)</span>
        <a-input-number
          :value="tabState(tab.id).sampleRate"
          @update:value="tabState(tab.id).sampleRate = Number($event ?? 1)"
          size="small"
          :min="1"
          :step="1"
          class="!text-xs w-[120px]"
        />
        <a-button size="small" @click="analysisStore.toggleBaselineTab(tab.id)">
          {{ analysisStore.baselineTabId === tab.id ? 'Unset' : 'Set Baseline' }}
        </a-button>
      </div>
      <AnalysisGroup 
        :node-id="tab.rootGroup.id"
        v-model:core="tab.rootGroup.core"
        :context="{
          baselineMap,
          groupPath: '',
          tabId: tab.id
        }"
        :is-root="true"
      />
    </a-tab-pane>
  </a-tabs>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AnalysisGroup from './AnalysisGroup.vue';
import { useAnalysisStore, type TabState } from '../stores/analysis';

type WaveformTab = {
  id: string;
  rootGroup: any;
};

type History = {
  timestamps: Array<string | number>;
  values: Record<string, number[]>;
};

const createRootGroup = () => ({
  id: 'root',
  type: 'group',
  core: {
    name: '',
    collapsed: false,
    children: [
      {
        id: 'g1',
        type: 'group',
        core: {
          name: 'GPU Performance Analysis',
          collapsed: false,
          children: [
            {
              id: 'a1',
              type: 'analysis',
              core: {
                name: 'Compute (SM) Throughput [%]',
                description: '',
                transformCode: '# Load waveform\nsm = W(\'top.sm_active\', clock=\'top.clk\')\nsm\n',
                chartType: 'line',
                summaryType: 'avg',
                maxValue: Number.NaN
              },
              context: {
                history: { timestamps: [], values: {} }
              }
            },
            {
              id: 'g2',
              type: 'group',
              core: {
                name: 'Memory Subsystem',
                collapsed: false,
                children: [
                  {
                    id: 'a2',
                    type: 'analysis',
                    core: {
                      name: 'Memory Throughput [%]',
                      description: '',
                      transformCode: '# Load waveforms\nwaves = WS([\'top.dram_read\', \'top.dram_write\'], clock=\'top.clk\')\nread = waves[0]\nwrite = waves[1]\n{\n  "dram_read": read,\n  "dram_write": write\n}',
                      chartType: 'bar',
                      summaryType: 'avg',
                      maxValue: Number.NaN
                    },
                    context: {
                      history: { timestamps: [], values: {} }
                    }
                  },
                  {
                    id: 'a3',
                    type: 'analysis',
                    core: {
                      name: 'L2 Cache Breakdown',
                      description: '',
                      transformCode: '# Load waveform\nl2 = W(\'top.l2_hit\', clock=\'top.clk\')\n{\n  "l2_hit": l2\n}',
                      chartType: 'heatmap',
                      summaryType: 'avg',
                      maxValue: Number.NaN
                    },
                    context: {
                      history: { timestamps: [], values: {} }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
});

const waveformTabs = ref<WaveformTab[]>([
]);
const activeTabId = ref('');
const nextTabIndex = ref(0);
const addWaveformTab = () => {
  const id = `waveform-${nextTabIndex.value}`;
  nextTabIndex.value += 1;
  waveformTabs.value.push({
    id,
    rootGroup: createRootGroup()
  });
  analysisStore.addTab(id);
  activeTabId.value = id;
};

const tabState = (id: string) => analysisStore.tabs[id] as TabState;
const analysisStore = useAnalysisStore();
addWaveformTab();

const tabNames = computed(() => {
  const counts: Record<string, number> = {};
  const result: Record<string, string> = {};
  waveformTabs.value.forEach((tab) => {
    const fileName = tabState(tab.id).wavePath.split('/').pop() ?? '';
    const base = fileName.replace(/\.[^/.]+$/, '') || 'Waveform';
    const count = counts[base] ?? 0;
    counts[base] = count + 1;
    result[tab.id] = count === 0 ? base : `${base}-${count}`;
  });
  return result;
});

const baselineMap = computed(() => {
  const baselineTab = waveformTabs.value.find(tab => tab.id === analysisStore.baselineTabId);
  if (!baselineTab) return {};
  const map: Record<string, { history: History }> = {};

  const walk = (node: any, path: string) => {
    if (node.type === 'group') {
      const nextPath = path ? `${path}/${node.core.name}` : node.core.name;
      node.core.children.forEach((child: any) => walk(child, nextPath));
      return;
    }
    if (node.type === 'analysis') {
      const signature = path ? `${path}/${node.core.name}` : node.core.name;
      map[signature] = { history: node.context.history };
    }
  };

  walk(baselineTab.rootGroup, '');
  return map;
});


const handleTabEdit = (targetKey: string | MouseEvent, action: 'add' | 'remove') => {
  if (action === 'add') {
    addWaveformTab();
    return;
  }
  const id = String(targetKey);
  const index = waveformTabs.value.findIndex(tab => tab.id === id);
  if (index === -1) return;
  waveformTabs.value.splice(index, 1);
  analysisStore.removeTab(id);
  if (activeTabId.value === id) {
    activeTabId.value = waveformTabs.value[0]?.id ?? '';
  }
};

</script>
