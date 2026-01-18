<template>
  <div class="border border-gray-300 dark:border-[#444] rounded-sm mb-2 overflow-hidden shadow-sm bg-white dark:bg-[#1f1f1f]">
    <!-- Group Header -->
    <div 
      class="flex justify-between items-center px-2 py-1.5 bg-gray-200 dark:bg-[#2d2d2d] cursor-pointer hover:bg-gray-300 dark:hover:bg-[#383838] transition-colors select-none group-header"
      @click="toggleCollapse"
    >
      <div class="flex items-center gap-1.5">
        <!-- Drag Handle Icon -->
        <holder-outlined class="cursor-move text-gray-400 dark:text-[#666] hover:text-gray-600 dark:hover:text-[#aaa]" />
        
        <folder-open-outlined v-if="!localCollapsed" class="text-gray-600 dark:text-[#aaa] text-sm" />
        <folder-outlined v-else class="text-gray-600 dark:text-[#aaa] text-sm" />
        <span class="font-bold text-sm text-gray-800 dark:text-[#f0f0f0]">{{ element.name }}</span>
      </div>
      <div class="text-gray-500 dark:text-[#aaa] text-[10px]">
        <down-outlined v-if="!localCollapsed" />
        <right-outlined v-else />
      </div>
    </div>
    
    <!-- Group Content (Draggable List) -->
    <div 
      v-show="!localCollapsed" 
      class="bg-gray-50 dark:bg-[#181818] border-t border-gray-200 dark:border-[#333]"
    >
      <draggable 
        :list="element.children" 
        item-key="id"
        group="analysis" 
        animation="200"
        ghost-class="ghost"
        drag-class="drag"
        handle=".group-header, .analysis-header"
        class="p-1.5 flex flex-col gap-1 min-h-[30px]"
      >
        <template #item="{ element: child }">
          <component 
            :is="child.type === 'group' ? 'AnalysisGroup' : Analysis" 
            :element="child"
            :name="child.name"
            :value="child.value"
            :history="child.history"
            v-model:metricCode="child.metricCode"
            v-model:transformCode="child.transformCode"
            @run="(payload) => $emit('run', payload || child)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  DownOutlined, 
  RightOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  HolderOutlined
} from '@ant-design/icons-vue';
import draggable from 'vuedraggable';
import Analysis from './Analysis.vue'; // Direct import for recursive use via component :is

// Recursive component definition
defineOptions({
  name: 'AnalysisGroup'
});

const props = defineProps<{
  element: any; // The group data object
}>();

defineEmits<{
  (e: 'run', item: any): void;
}>();

const localCollapsed = ref(props.element.collapsed || false);

const toggleCollapse = () => {
  localCollapsed.value = !localCollapsed.value;
  // Update the model if needed, but local state is fine for UI toggle
  props.element.collapsed = localCollapsed.value;
};

watch(() => props.element.collapsed, (val) => {
  localCollapsed.value = val;
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
