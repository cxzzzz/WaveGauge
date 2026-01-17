<template>
  <div class="p-5 min-h-screen transition-colors duration-300 bg-gray-100 text-gray-900 dark:bg-black dark:text-white">
    <div class="flex justify-between items-center mb-8 max-w-[800px] mx-auto">
      <h1 class="text-3xl font-bold m-0">Analysis Component Demo</h1>
      <div class="flex items-center gap-2">
        <span>{{ isDarkMode ? 'Dark' : 'Light' }} Mode</span>
        <a-switch 
          v-model:checked="isDarkMode" 
          checked-children="🌙" 
          un-checked-children="☀️"
          @change="toggleTheme"
        />
      </div>
    </div>
    
    <div class="max-w-[800px] mx-auto">
      <Analysis 
        name="Compute (SM) Throughput [%]" 
        :value="0.85" 
        :history="history1"
        v-model:code="code1"
        @run="handleRun('Compute')"
      />
      
      <Analysis 
        name="Memory Throughput [%]" 
        :value="0.45" 
        :history="history2"
        v-model:code="code2"
        @run="handleRun('Memory')"
      />

       <Analysis 
        name="L2 Cache Breakdown" 
        :value="multiValue" 
        :history="multiHistory"
        v-model:code="code3"
        @run="handleRun('L2 Cache')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Analysis from './components/Analysis.vue';
import { message } from 'ant-design-vue';

const code1 = ref('# Calculate SM Throughput\n(sm_active / elapsed) * 100');
const code2 = ref('# Calculate Memory Throughput\n(dram_read + dram_write) / peak_bw');
const code3 = ref('# Calculate L2 Cache Metrics\nreturn {\n  "L2 Hit Rate": 0.85,\n  "L2 Throughput": 0.45,\n  "L2 Write Hit Rate": 0.92\n}');

const multiValue = ref({
  "L2 Hit Rate": 0.85,
  "L2 Throughput": 0.45,
  "L2 Write Hit Rate": 0.92
});

const history1 = [
  { step: 'Step 1', value: 0.2 },
  { step: 'Step 2', value: 0.5 },
  { step: 'Step 3', value: 0.85 },
  { step: 'Step 4', value: 0.6 },
  { step: 'Step 5', value: 0.85 }
];

const history2 = [
  { step: 'T-4', value: 0.3 },
  { step: 'T-3', value: 0.35 },
  { step: 'T-2', value: 0.4 },
  { step: 'T-1', value: 0.42 },
  { step: 'Current', value: 0.45 }
];

const multiHistory = [
  { step: '10:00', "L2 Hit Rate": 0.8, "L2 Throughput": 0.4, "L2 Write Hit Rate": 0.9 },
  { step: '10:05', "L2 Hit Rate": 0.82, "L2 Throughput": 0.42, "L2 Write Hit Rate": 0.91 },
  { step: '10:10', "L2 Hit Rate": 0.75, "L2 Throughput": 0.5, "L2 Write Hit Rate": 0.88 },
  { step: '10:15', "L2 Hit Rate": 0.85, "L2 Throughput": 0.45, "L2 Write Hit Rate": 0.92 }
];

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

const handleRun = (name: string) => {
  message.loading(`Running analysis for ${name}...`, 1);
  setTimeout(() => {
    message.success(`Analysis for ${name} completed!`);
  }, 1000);
};
</script>
