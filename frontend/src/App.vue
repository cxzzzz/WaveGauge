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
                :value="element.value"
                :history="element.history"
                v-model:metricCode="element.metricCode"
                v-model:transformCode="element.transformCode"
                @run="handleRun(element)"
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
import { message } from 'ant-design-vue';
import axios from 'axios';
import draggable from 'vuedraggable';

const API_URL = 'http://localhost:8000/api';

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
        value: 0.85,
        history: [
          { step: 'Step 1', value: 0.2 },
          { step: 'Step 2', value: 0.5 },
          { step: 'Step 3', value: 0.85 },
          { step: 'Step 4', value: 0.6 },
          { step: 'Step 5', value: 0.85 }
        ],
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
            value: 0.45,
            history: [
              { step: 'T-4', value: 0.3 },
              { step: 'T-3', value: 0.35 },
              { step: 'T-2', value: 0.4 },
              { step: 'T-1', value: 0.42 },
              { step: 'Current', value: 0.45 }
            ],
            metricCode: '# Calculate Memory Throughput\n# Return a single value (0-1)\nnp.mean(data["dram_read"] + data["dram_write"]) / 100',
            transformCode: '# Pre-process Waveforms\n# Normalize bandwidth\n# data["dram_read"] /= 1024**3'
          },
          {
            id: 'a3',
            type: 'analysis',
            name: 'L2 Cache Breakdown',
            value: {
              "L2 Hit Rate": 0.85,
              "L2 Throughput": 0.45,
              "L2 Write Hit Rate": 0.92
            },
            history: [
              { step: '10:00', "L2 Hit Rate": 0.8, "L2 Throughput": 0.4, "L2 Write Hit Rate": 0.9 },
              { step: '10:05', "L2 Hit Rate": 0.82, "L2 Throughput": 0.42, "L2 Write Hit Rate": 0.91 },
              { step: '10:10', "L2 Hit Rate": 0.75, "L2 Throughput": 0.5, "L2 Write Hit Rate": 0.88 },
              { step: '10:15', "L2 Hit Rate": 0.85, "L2 Throughput": 0.45, "L2 Write Hit Rate": 0.92 }
            ],
            metricCode: '# Calculate L2 Cache Metrics\nreturn {\n  "L2 Hit Rate": np.mean(data["l2_hit"]),\n  "L2 Throughput": 0.45,\n  "L2 Write Hit Rate": 0.92\n}',
            transformCode: '# Pre-process Waveforms\n# Aggregate cache stats\n# data = data.groupby("timestamp").sum()'
          }
        ]
      }
    ]
  }
]);

const handleRun = async (item: any) => {
  message.loading(`Running analysis for ${item.name}...`, 0);
  
  try {
    const response = await axios.post(`${API_URL}/analyze`, {
      file_path: 'dummy.fsdb', // Placeholder
      transform_code: item.transformCode,
      metric_code: item.metricCode
    });

    if (response.data.status === 'success') {
      message.destroy();
      message.success(`Analysis for ${item.name} completed!`);
      
      // Update value
      item.value = response.data.metrics;
      
      // Update history/table data if needed
      console.log('Processed Data:', response.data.data);
      
      // Example: If name contains "Compute", we map 'sm_active' to value
      if (item.name.includes('Compute') && response.data.data.length > 0) {
          // Clear array and push new items
          item.history = [];
          response.data.data.forEach((row: any, index: number) => {
             if (index < 20) { // Limit for chart
                 item.history.push({
                     step: row.timestamp ? String(row.timestamp) : String(index),
                     value: row.sm_active || 0
                 });
             }
          });
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