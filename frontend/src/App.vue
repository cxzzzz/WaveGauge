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
      <draggable 
        :list="analysisData" 
        item-key="id"
        group="analysis" 
        animation="200"
        ghost-class="ghost"
        drag-class="drag"
        handle=".group-header, .analysis-header"
        class="flex flex-col gap-2 min-h-[500px]"
      >
        <template #item="{ element }">
           <div class="mb-1">
              <AnalysisGroup 
                v-if="element.type === 'group'" 
                :element="element" 
                @run="handleRun"
              />
              <Analysis 
                v-else 
                :name="element.name"
                v-model:metricCode="element.metricCode"
                v-model:transformCode="element.transformCode"
              />
           </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AnalysisGroup from './components/AnalysisGroup.vue';
import Analysis from './components/Analysis.vue';
import draggable from 'vuedraggable';

const analysisData = ref([
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
        transformCode: '# Pre-process Waveforms\n# Filter out idle periods\n# data is a pandas DataFrame\ndata = data[data["sm_active"] >= 0]'
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
            transformCode: '# Pre-process Waveforms\n# Normalize bandwidth\n# data["dram_read"] /= 1024**3'
          },
          {
            id: 'a3',
            type: 'analysis',
            name: 'L2 Cache Breakdown',
            metricCode: '# Calculate L2 Cache Metrics\n{\n  "L2 Hit Rate": np.mean(data["l2_hit"]),\n  "L2 Throughput": 0.45,\n  "L2 Write Hit Rate": 0.92\n}',
            transformCode: '# Pre-process Waveforms\n# Aggregate cache stats\n# data = data.groupby("timestamp").sum()'
          }
        ]
      }
    ]
  }
]);

const isDarkMode = ref(true);

const toggleTheme = (checked: boolean) => {
  if (checked) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

onMounted(() => {
  // Initialize based on ref default
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  }
});
</script>

<style scoped>
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
.dark .ghost {
  background: #2a2a2a;
  opacity: 0.5;
}
</style>