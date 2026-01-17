<template>
  <div class="wave-analysis">
    <!-- Split Layout: Left Editor, Right Report -->
    <a-row :gutter="16" style="height: 100%">
      <a-col :span="8" style="height: 100%; display: flex; flex-direction: column;">
        <a-card title="Analysis Logic" style="flex: 1; display: flex; flex-direction: column;" :bodyStyle="{flex: 1, display: 'flex', flexDirection: 'column'}">
          <template #extra>
            <a-button type="primary" :loading="loading" @click="$emit('run')">
              <play-circle-outlined />
              Run
            </a-button>
          </template>
          <a-textarea 
            :value="code" 
            @update:value="$emit('update:code', $event)" 
            style="font-family: monospace; font-size: 14px; flex: 1; resize: none;" 
          />
          <div style="margin-top: 10px; color: #666; font-size: 12px;">
            Return a dictionary to generate a dashboard report. <br/>
            Context: <code>w</code>, <code>np</code>
          </div>
        </a-card>
      </a-col>

      <a-col :span="16" style="height: 100%; overflow: auto;">
        <a-card v-if="result !== null" title="Analysis Report" style="min-height: 100%">
           <AnalysisResult :data="result" />
        </a-card>
        <div v-else class="empty-state">
          <a-empty description="Run analysis to see results" />
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { PlayCircleOutlined } from '@ant-design/icons-vue';
import AnalysisResult from './AnalysisResult.vue';

defineProps<{
  code: string;
  result: any;
  loading: boolean;
}>();

defineEmits<{
  (e: 'update:code', val: string): void;
  (e: 'run'): void;
}>();
</script>

<style scoped>
.wave-analysis {
  height: 100%;
  padding: 10px 0;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
}
</style>
