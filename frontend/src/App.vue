<template>
  <div class="p-3 min-h-screen transition-colors duration-300 bg-gray-100 text-gray-900 dark:bg-black dark:text-white">
    <div class="flex justify-between items-center mb-4 max-w-[800px] mx-auto">
      <h1 class="text-xl font-bold m-0">Analysis Component Demo</h1>
      <div class="flex items-center">
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
      <WaveformTabs />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import WaveformTabs from './components/WaveformTabs.vue';
const isDarkMode = ref(false);

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
