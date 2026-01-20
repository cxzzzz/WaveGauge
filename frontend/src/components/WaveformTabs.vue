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
          v-model:value="tab.path"
          size="small"
          placeholder="Enter waveform file path"
          class="!text-xs"
        />
        <a-button size="small" @click="analysisStore.setBaselineTab(tab.id)">
          {{ analysisStore.baselineTabId === tab.id ? 'Unset' : 'Set Baseline' }}
        </a-button>
      </div>
      <AnalysisGroup 
        :node-id="tab.rootGroup.id"
        v-model:core="tab.rootGroup.core"
        :context="{
          wavePath: tab.path,
          baselineMap,
          groupPath: '',
          isBaseline: analysisStore.baselineTabId === tab.id,
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
import { useAnalysisStore } from '../stores/analysis';

type WaveformTab = {
  id: string;
  path: string;
  rootGroup: any;
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
                transformCode: '# Load waveform\nsm = W(\'top.sm_active\', clock=\'top.clk\')\ndata = pd.DataFrame({\n  "sm_active": sm.value\n})',
                chartType: 'line',
                summaryType: 'avg',
                maxValue: undefined
              },
              context: {
                history: []
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
                      transformCode: '# Load waveforms\nwaves = WS([\'top.dram_read\', \'top.dram_write\'], clock=\'top.clk\')\nread = waves[0]\nwrite = waves[1]\ndata = pd.DataFrame({\n  "dram_read": read.value,\n  "dram_write": write.value\n})',
                      chartType: 'bar',
                      summaryType: 'avg',
                      maxValue: undefined
                    },
                    context: {
                      history: []
                    }
                  },
                  {
                    id: 'a3',
                    type: 'analysis',
                    core: {
                      name: 'L2 Cache Breakdown',
                      transformCode: '# Load waveform\nl2 = W(\'top.l2_hit\', clock=\'top.clk\')\ndata = pd.DataFrame({\n  "l2_hit": l2.value\n})',
                      chartType: 'heatmap',
                      summaryType: 'avg',
                      maxValue: undefined
                    },
                    context: {
                      history: []
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
  {
    id: 'waveform-1',
    path: '/home/cxzzzz/Programming/hardware/WaveGauge/backend/sample.vcd',
    rootGroup: createRootGroup()
  }
]);
const analysisStore = useAnalysisStore();
const firstTab = waveformTabs.value[0];
if (firstTab) {
  analysisStore.ensureTab(firstTab.id);
  if (!analysisStore.baselineTabId) {
    analysisStore.setBaselineTab(firstTab.id);
  }
}
const activeTabId = ref('waveform-1');
const nextTabIndex = ref(2);

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
  const baselineTab = waveformTabs.value.find(tab => tab.id === analysisStore.baselineTabId);
  if (!baselineTab) return {};
  const map: Record<string, { history: any[] | undefined }> = {};

  const walk = (node: any, path: string) => {
    if (node?.type === 'group') {
      const nextPath = buildGroupPath(path, node.core?.name ?? '');
      (node.core?.children ?? []).forEach((child: any) => walk(child, nextPath));
      return;
    }
    if (node?.type === 'analysis') {
      const signature = buildSignature(path, node.core?.name ?? '');
      map[signature] = { history: node.context?.history };
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
    rootGroup: createRootGroup()
  });
  analysisStore.ensureTab(id);
  activeTabId.value = id;
};

const handleTabEdit = (_targetKey: string | MouseEvent, action: 'add' | 'remove') => {
  if (action === 'add') {
    addWaveformTab();
  }
};

</script>
