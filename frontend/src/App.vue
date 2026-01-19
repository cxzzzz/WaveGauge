<template>
  <div class="p-3 min-h-screen transition-colors duration-300 bg-gray-100 text-gray-900 dark:bg-black dark:text-white">
    <div class="flex justify-between items-center mb-4 max-w-[800px] mx-auto">
      <h1 class="text-xl font-bold m-0">Analysis Component Demo</h1>
      <div class="flex items-center gap-2 text-sm">
        <span>{{ isDarkMode ? 'Dark' : 'Light' }} Mode</span>
        <a-switch 
          v-model:checked="isDarkMode" 
          checked-children="🌙" 
          un-checked-children="☀️"
          @change="toggleTheme"
          size="small"
        />
      </div>
    </div>
    
    <div class="max-w-[800px] mx-auto">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs text-gray-600 dark:text-[#a0a0a0] whitespace-nowrap">Waveform Path</span>
        <a-input
          v-model:value="wavePath"
          size="small"
          placeholder="Enter waveform file path"
          class="!text-xs"
        />
      </div>
      <AnalysisGroup 
        :element="rootGroup" 
        :is-root="true"
        :wave-path="wavePath"
        v-model:zoomStart="zoomStart"
        v-model:zoomEnd="zoomEnd"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AnalysisGroup from './components/AnalysisGroup.vue';

const rootGroup = ref({
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
          transformCode: '# Load waveform\nsm = W(\'top.sm_active\', clock=\'top.clk\')\ndata = pd.DataFrame({\n  "timestamp": np.arange(len(sm.value)),\n  "sm_active": sm.value\n})',
          chartType: 'line',
          summaryType: 'avg'
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
              transformCode: '# Load waveforms\nwaves = WS([\'top.dram_read\', \'top.dram_write\'], clock=\'top.clk\')\nread = waves[0]\nwrite = waves[1]\ndata = pd.DataFrame({\n  "timestamp": np.arange(len(read.value)),\n  "dram_read": read.value,\n  "dram_write": write.value\n})',
              chartType: 'bar',
              summaryType: 'avg'
            },
            {
              id: 'a3',
              type: 'analysis',
              name: 'L2 Cache Breakdown',
              metricCode: '# Calculate L2 Cache Metrics\n{\n  "L2 Hit Rate": np.mean(data["l2_hit"]),\n  "L2 Throughput": 0.45,\n  "L2 Write Hit Rate": 0.92\n}',
              transformCode: '# Load waveform\nl2 = W(\'top.l2_hit\', clock=\'top.clk\')\ndata = pd.DataFrame({\n  "timestamp": np.arange(len(l2.value)),\n  "l2_hit": l2.value\n})',
              chartType: 'heatmap',
              summaryType: 'avg'
            }
          ]
        }
      ]
    }
  ]
});

const wavePath = ref('/home/cxzzzz/Programming/hardware/WaveGauge/backend/sample.vcd');
const zoomStart = ref(0);
const zoomEnd = ref(100);
const isDarkMode = ref(true);

const toggleTheme = (checked: boolean) => {
  if (checked) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
</script>

<style scoped>
/* Styles handled in child components */
</style>
