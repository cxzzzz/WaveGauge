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
            v-model:value="localName" 
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
          {{ groupName }}
        </span>
        <edit-outlined v-if="!isEditingName" class="text-xs text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" @click.stop="startEditing" />
      </div>
      
      <div class="flex items-center gap-0.5" @click.stop>
        <a-tooltip title="Add Analysis">
          <a-button 
            type="text" 
            size="small" 
            class="inline-flex items-center justify-center !text-gray-500 hover:!text-blue-600 dark:!text-[#aaa] dark:hover:!text-blue-400 !h-5 !w-5 !px-0 !leading-none"
            @click="addAnalysis"
          >
            <template #icon><line-chart-outlined /></template>
          </a-button>
        </a-tooltip>

        <a-tooltip title="Add SubGroup">
          <a-button 
            type="text" 
            size="small" 
            class="inline-flex items-center justify-center !text-gray-500 hover:!text-blue-600 dark:!text-[#aaa] dark:hover:!text-blue-400 !h-5 !w-5 !px-0 !leading-none"
            @click="addGroup"
          >
            <template #icon><folder-add-outlined /></template>
          </a-button>
        </a-tooltip>

        <a-tooltip title="Run All Analyses">
          <a-button 
            type="text" 
            size="small" 
            class="inline-flex items-center justify-center !text-gray-500 hover:!text-green-600 dark:!text-[#aaa] dark:hover:!text-green-400 !h-5 !w-5 !px-0 !leading-none"
            @click="runAllAnalyses"
          >
            <template #icon><play-circle-outlined /></template>
          </a-button>
        </a-tooltip>

        <a-dropdown trigger="click">
          <a-button type="text" size="small" class="inline-flex items-center justify-center !text-gray-500 hover:!text-gray-800 dark:!text-[#aaa] dark:hover:!text-white !h-5 !w-5 !px-0 !leading-none">
            <template #icon><more-outlined /></template>
          </a-button>
          <template #overlay>
            <a-menu>
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
        
        <div class="text-gray-500 dark:text-[#aaa] text-[10px] ml-1 w-4 flex justify-center" @click="toggleCollapse">
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
        :list="childrenModel" 
        item-key="id"
        group="analysis" 
        animation="200"
        ghost-class="ghost"
        drag-class="drag"
        handle=".group-header, .analysis-header"
        class="p-1 flex flex-col gap-0.5 min-h-[24px]"
      >
        <template #item="{ element: child, index }">
          <AnalysisGroup
            v-if="child.type === 'group'"
            :node-id="child.id"
            v-model:core="child.core"
            :context="{
              groupPath: groupPathModel ? `${groupPathModel}/${child.core.name}` : child.core.name,
              baselineMap: contextModel.baselineMap,
              tabId: contextModel.tabId
            }"
            :is-root="false"
            :ref="(el: any) => setChildRef(el, child.id)"
            @delete="deleteChild(index)"
          />
          <Analysis
            v-else
            :ref="(el: any) => setChildRef(el, child.id)"
            v-model:core="child.core"
            :context="buildAnalysisContext(child)"
            @update:context="(val) => updateChildContext(child.id, val.data)"
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
  LineChartOutlined,
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

type GroupCore = {
  name: string;
  collapsed: boolean;
  children: any[];
};

type AnalysisData = unknown;

type GroupContext = {
  groupPath: string;
  baselineMap: Record<string, { data: AnalysisData }>;
  tabId: string;
};

const props = defineProps<{
  nodeId: string;
  core: GroupCore;
  context: GroupContext;
  isRoot: boolean;
}>();

const emit = defineEmits<{
  (e: 'delete'): void;
  (e: 'update:core', val: GroupCore): void;
}>();

const coreModel = computed({
  get: () => props.core,
  set: (val: GroupCore) => emit('update:core', val)
});
const contextModel = computed(() => props.context);
const updateCore = (patch: Partial<GroupCore>) => {
  emit('update:core', { ...props.core, ...patch });
};

const childrenModel = computed({
  get: () => coreModel.value.children,
  set: (val: any[]) => updateCore({ children: val })
});

const localCollapsed = ref(coreModel.value.collapsed);
const groupName = computed(() => coreModel.value.name);
const localName = ref(groupName.value);
const fileInput = ref<HTMLInputElement | null>(null);
const isEditingName = ref(false);
const nameInput = ref<any>(null);
const childRefs = ref(new Map<string, any>());
const groupPathModel = computed(() => contextModel.value.groupPath);
const EMPTY_DATA: AnalysisData = null;

const buildAnalysisContext = (child: any) => {
  const signature = groupPathModel.value
    ? `${groupPathModel.value}/${child.core.name}`
    : child.core.name;
  const baselineEntry = contextModel.value.baselineMap[signature];
  return {
    data: child.context.data,
    baselineData: baselineEntry ? baselineEntry.data : EMPTY_DATA,
    tabId: contextModel.value.tabId
  };
};
const updateChildContext = (childId: string, data: AnalysisData) => {
  const next = childrenModel.value.map((child: any) => {
    if (child.id !== childId) return child;
    return {
      ...child,
      context: {
        ...child.context,
        data
      }
    };
  });
  updateCore({ children: next });
};

watch(groupName, (val) => {
  localName.value = val;
});

const startEditing = () => {
  isEditingName.value = true;
  setTimeout(() => {
    nameInput.value!.focus();
  }, 0);
};

const toggleCollapse = () => {
  localCollapsed.value = !localCollapsed.value;
  updateCore({ collapsed: localCollapsed.value });
};

const saveName = () => {
  isEditingName.value = false;
  if (localName.value !== groupName.value) {
    updateCore({ name: localName.value });
  }
};

watch(() => coreModel.value.collapsed, (val) => {
  localCollapsed.value = val;
});

const deleteChild = (index: number) => {
  const next = [...childrenModel.value];
  next.splice(index, 1);
  updateCore({ children: next });
};

const addAnalysis = () => {
  const next = [...childrenModel.value];
  next.push({
    id: uuidv4(),
    type: 'analysis',
    core: {
      name: 'New Analysis',
      description: '',
      transformCode: '# Transform data\n# data = ...',
      chartType: 'line',
      summaryType: 'avg',
      maxValue: Number.NaN
    },
    context: {
      data: null
    }
  });
  updateCore({ children: next });
  // Auto expand if collapsed
  if (localCollapsed.value) toggleCollapse();
};

const addGroup = () => {
  const next = [...childrenModel.value];
  next.push({
    id: uuidv4(),
    type: 'group',
    core: {
      name: 'New Group',
      collapsed: false,
      children: []
    }
  });
  updateCore({ children: next });
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
  for (const child of childrenModel.value) {
    const refInstance = childRefs.value.get(child.id);
    if (!refInstance) {
      throw new Error(`Missing ref for child ${child.id}`);
    }
    if (child.type === 'group') {
      await refInstance.runAllAnalyses();
    } else if (child.type === 'analysis') {
      await refInstance.runAnalysis();
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
    const { context, ...rest } = data;
    let children: any[] | undefined;
    if ('children' in rest) {
      children = rest.children;
    } else if ('core' in rest && rest.core && 'children' in rest.core) {
      children = rest.core.children;
    }
    if (children) {
      if ('children' in rest) {
        rest.children = cleanExportData(children);
      }
      if ('core' in rest && rest.core && 'children' in rest.core) {
        rest.core = {
          ...rest.core,
          children: cleanExportData(children)
        };
      }
    }
    return rest;
  }
  return data;
};

const exportGroup = () => {
  const groupData = {
    id: props.nodeId,
    type: 'group',
    core: {
      ...props.core,
      children: childrenModel.value
    }
  };
  const data = JSON.stringify({
    version: '1.0',
    type: 'wavegauge_export',
    data: cleanExportData(groupData)
  }, null, 2);
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${groupName.value.replace(/\s+/g, '_')}_export.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success('Group exported successfully');
};

const triggerImport = () => {
  fileInput.value!.click();
};

const handleImport = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) {
    throw new Error('No file selected');
  }
  const file = input.files[0];
  if (!file) {
    throw new Error('No file selected');
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const target = e.target as FileReader;
      if (typeof target.result !== 'string') {
        throw new Error('Invalid file content');
      }
      const content = target.result;
      const json = JSON.parse(content);
      
      if (json.version && json.data) {
        const importedData = json.data;

        const processImportedItem = (item: any) => {
          item.id = uuidv4();
          if (item.type === 'analysis') {
            const source = item.core ? item.core : item;
            if (typeof source.name !== 'string' || source.name.length === 0) {
              throw new Error('Invalid analysis name');
            }
            if (typeof source.transformCode !== 'string') {
              throw new Error('Invalid analysis transformCode');
            }
            if (typeof source.chartType !== 'string' || source.chartType.length === 0) {
              throw new Error('Invalid analysis chartType');
            }
            if (typeof source.summaryType !== 'string' || source.summaryType.length === 0) {
              throw new Error('Invalid analysis summaryType');
            }
            const description = typeof source.description === 'string' ? source.description : '';
            let maxValue = Number.NaN;
            // JSON.stringify converts NaN to null, so we need to handle null as NaN (Auto)
            if (source.maxValue !== null && source.maxValue !== undefined) {
              const val = Number(source.maxValue);
              if (Number.isFinite(val)) {
                maxValue = val;
              }
            }
            item.core = {
              name: source.name,
              transformCode: source.transformCode,
              description,
              chartType: source.chartType,
              summaryType: source.summaryType,
              maxValue,
              analysisType: source.analysisType
            };
            item.context = {
              data: item.context && item.context.data
                ? item.context.data
                : (item.data ? item.data : null)
            };
            delete item.name;
            delete item.transformCode;
            delete item.description;
            delete item.chartType;
            delete item.summaryType;
            delete item.maxValue;
            delete item.data;
            delete item.state;
            return;
          }
          if (item.type === 'group') {
            if (!item.core) {
              if (typeof item.name !== 'string' || item.name.length === 0) {
                throw new Error('Invalid group name');
              }
              item.core = { name: item.name, collapsed: false, children: [] };
            }
            const coreChildren = item.core.children;
            const stateChildren = item.state && item.state.children ? item.state.children : undefined;
            const directChildren = item.children;
            const children = coreChildren || stateChildren || directChildren || [];
            item.core = {
              ...item.core,
              collapsed: typeof item.core.collapsed === 'boolean'
                ? item.core.collapsed
                : (item.state && typeof item.state.collapsed === 'boolean'
                  ? item.state.collapsed
                  : (typeof item.collapsed === 'boolean' ? item.collapsed : false)),
              children
            };
            delete item.name;
            delete item.collapsed;
            delete item.children;
            delete item.state;
            item.core.children.forEach(processImportedItem);
          }
        };
        
        processImportedItem(importedData);
        updateCore({ children: [...childrenModel.value, importedData] });
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
        fileInput.value!.value = '';
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
