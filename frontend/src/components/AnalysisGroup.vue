<template>
  <div class="border border-gray-300 dark:border-[#444] rounded-sm mb-1 overflow-hidden shadow-sm bg-white dark:bg-[#1f1f1f]">
    <!-- Group Header -->
    <div 
      class="flex justify-between items-center px-1.5 py-1 bg-gray-200 dark:bg-[#2d2d2d] cursor-pointer hover:bg-gray-300 dark:hover:bg-[#383838] transition-colors select-none group-header"
      @click="toggleCollapse"
    >
      <div class="flex items-center gap-1">
        <!-- Drag Handle Icon -->
        <holder-outlined v-if="!isRoot" class="cursor-move text-gray-400 dark:text-[#666] hover:text-gray-600 dark:hover:text-[#aaa]" />
        
        <folder-open-outlined v-if="!localCollapsed" class="text-gray-600 dark:text-[#aaa] text-sm" />
        <folder-outlined v-else class="text-gray-600 dark:text-[#aaa] text-sm" />
        
        <!-- Editable Name -->
        <div v-if="isEditingName" class="flex-1" @click.stop>
          <a-input 
            ref="nameInput"
            v-model:value="element.name" 
            size="small" 
            @blur="saveName" 
            @pressEnter="saveName"
            class="!text-xs font-bold"
          />
        </div>
        <span 
          v-else 
          @click.stop
          @dblclick.stop="startEditing" 
          class="font-bold text-xs text-gray-800 dark:text-[#f0f0f0] truncate"
        >
          {{ element.name }}
        </span>
        <edit-outlined v-if="!isEditingName" class="text-xs text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" @click.stop="startEditing" />
      </div>
      
      <div class="flex items-center gap-1.5" @click.stop>
        <a-dropdown trigger="click">
          <a-button type="text" size="small" class="inline-flex items-center justify-center !text-gray-500 hover:!text-gray-800 dark:!text-[#aaa] dark:hover:!text-white !h-5 !w-5 !px-0 !leading-none">
            <template #icon><more-outlined /></template>
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="add-analysis" @click="addAnalysis">
                <file-add-outlined /> Add Analysis
              </a-menu-item>
              <a-menu-item key="add-group" @click="addGroup">
                <folder-add-outlined /> Add Group
              </a-menu-item>
              <a-menu-item key="run-all" @click="runAllAnalyses">
                <play-circle-outlined /> Run All Analyses
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="export" @click="exportGroup">
                <download-outlined /> Export Group
              </a-menu-item>
              <a-menu-item key="import" @click="triggerImport">
                <upload-outlined /> Import Group
              </a-menu-item>
              <a-menu-divider v-if="!isRoot" />
              <a-menu-item v-if="!isRoot" key="delete" danger @click="$emit('delete')">
                <delete-outlined /> Delete Group
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        
        <div class="text-gray-500 dark:text-[#aaa] text-[10px] ml-1">
            <down-outlined v-if="!localCollapsed" />
            <right-outlined v-else />
        </div>
      </div>
    </div>
    
    <!-- Hidden File Input for Import -->
    <input 
      type="file" 
      ref="fileInput" 
      class="hidden" 
      accept=".json" 
      @change="handleImport"
    />
    
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
        class="p-1 flex flex-col gap-0.5 min-h-[24px]"
      >
        <template #item="{ element: child, index }">
          <component 
            :is="child.type === 'group' ? 'AnalysisGroup' : Analysis" 
            :element="child"
            :wave-path="wavePath"
            :ref="(el: any) => setChildRef(el, child.id)"
            v-model:zoomStart="zoomStartModel"
            v-model:zoomEnd="zoomEndModel"
            v-model:chartType="child.chartType"
            v-model:summaryType="child.summaryType"
            v-model:maxValue="child.maxValue"
            v-model:name="child.name"
            v-model:description="child.description"
            v-model:metricCode="child.metricCode"
            v-model:transformCode="child.transformCode"
            v-model:result="child.result"
            v-model:history="child.history"
            @delete="deleteChild(index)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { 
  DownOutlined, 
  RightOutlined, 
  FolderOutlined, 
  FolderOpenOutlined, 
  HolderOutlined, 
  MoreOutlined, 
  FileAddOutlined, 
  FolderAddOutlined, 
  DownloadOutlined, 
  UploadOutlined, 
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import draggable from 'vuedraggable';
import Analysis from './Analysis.vue'; // Direct import for recursive use via component :is
import { v4 as uuidv4 } from 'uuid';

// Recursive component definition
defineOptions({
  name: 'AnalysisGroup'
});

const props = defineProps<{
  element: any; // The group data object
  isRoot?: boolean;
  wavePath?: string;
  zoomStart?: number;
  zoomEnd?: number;
}>();

const emit = defineEmits<{
  (e: 'delete'): void;
  (e: 'update:zoomStart', val: number): void;
  (e: 'update:zoomEnd', val: number): void;
}>();

const localCollapsed = ref(props.element.collapsed || false);
const fileInput = ref<HTMLInputElement | null>(null);
const isEditingName = ref(false);
const nameInput = ref<any>(null);
const childRefs = ref(new Map<string, any>());
const zoomStartModel = computed({
  get: () => props.zoomStart ?? 0,
  set: (val: number) => emit('update:zoomStart', val)
});
const zoomEndModel = computed({
  get: () => props.zoomEnd ?? 100,
  set: (val: number) => emit('update:zoomEnd', val)
});

const startEditing = () => {
  isEditingName.value = true;
  setTimeout(() => {
    nameInput.value?.focus();
  }, 0);
};

const toggleCollapse = () => {
  localCollapsed.value = !localCollapsed.value;
  // Update the model if needed, but local state is fine for UI toggle
  props.element.collapsed = localCollapsed.value;
};

const saveName = () => {
  isEditingName.value = false;
};

watch(() => props.element.collapsed, (val) => {
  localCollapsed.value = val;
});

const deleteChild = (index: number) => {
  props.element.children.splice(index, 1);
};

const addAnalysis = () => {
  props.element.children.push({
    id: uuidv4(),
    type: 'analysis',
    name: 'New Analysis',
    description: '',
    metricCode: '# Calculate metric\n# Return a value\nreturn 0',
    transformCode: '# Transform data\n# data = ...',
    chartType: 'line',
    summaryType: 'avg',
    maxValue: undefined
  });
  // Auto expand if collapsed
  if (localCollapsed.value) toggleCollapse();
};

const addGroup = () => {
  props.element.children.push({
    id: uuidv4(),
    type: 'group',
    name: 'New Group',
    collapsed: false,
    children: []
  });
  if (localCollapsed.value) toggleCollapse();
};

const setChildRef = (el: any, id: string) => {
  if (!id) return;
  if (el) {
    childRefs.value.set(id, el);
  } else {
    childRefs.value.delete(id);
  }
};

const runAllAnalyses = async () => {
  for (const child of props.element.children) {
    const refInstance = childRefs.value.get(child.id);
    if (child.type === 'group') {
      await refInstance?.runAllAnalyses?.();
    } else if (child.type === 'analysis') {
      await refInstance?.runAnalysis?.();
    }
  }
};

defineExpose({
  runAllAnalyses
});

const cleanExportData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(cleanExportData);
  } else if (typeof data === 'object' && data !== null) {
    const { result, history, ...rest } = data;
    if (rest.children) {
      rest.children = cleanExportData(rest.children);
    }
    return rest;
  }
  return data;
};

const exportGroup = () => {
  const data = JSON.stringify({
    version: '1.0',
    type: 'wavegauge_export',
    data: cleanExportData(props.element)
  }, null, 2);
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.element.name.replace(/\s+/g, '_')}_export.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success('Group exported successfully');
};

const triggerImport = () => {
  fileInput.value?.click();
};

const handleImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const json = JSON.parse(content);
      
      if (json.version && json.data) {
        // Basic validation
        // Check if we are importing a group or list of items?
        // If imported item is a group, we can add it as a child.
        // Or if user wants to merge content? User said "Importing keeps parts already added", implies merging/appending.
        
        const importedData = json.data;
        
        // If imported data is a group (has children), do we add the group itself or its children?
        // Let's treat it as: we add the imported object to our children.
        // But if we exported THIS group, we get a group object. If we import it back, we probably want to add it as a subgroup?
        // Or should we assume we are importing *into* the current group?
        // If I export "Memory Subsystem", I get a JSON for that group.
        // If I import it into "GPU Analysis", I expect "Memory Subsystem" to appear inside "GPU Analysis".
        // That seems correct.
        
        // However, we should regenerate IDs to avoid conflicts?
        // For now, let's keep IDs but maybe warn or just append.
        // Ideally we should deep clone and regenerate IDs.
        
        const processImportedItem = (item: any) => {
            // Simple ID regeneration
            item.id = uuidv4();
            if (item.children) {
                item.children.forEach(processImportedItem);
            }
        };
        
        processImportedItem(importedData);
        props.element.children.push(importedData);
        message.success('Import successful');
        
        if (localCollapsed.value) toggleCollapse();
      } else {
        message.error('Invalid file format');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to parse JSON');
    } finally {
        // Reset input
        if (fileInput.value) fileInput.value.value = '';
    }
  };
  reader.readAsText(file);
};
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
