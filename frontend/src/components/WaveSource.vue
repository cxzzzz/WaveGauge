<template>
  <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
    <a-card title="Data Source Configuration">
      <h3>Load Waveform</h3>
      <div style="margin-bottom: 20px">
        <div style="margin-bottom: 10px">
          <span>Server Path:</span>
          <a-input 
            :value="path" 
            @update:value="$emit('update:path', $event)" 
            placeholder="/path/to/wave.fsdb" 
            style="margin-top: 5px"
          />
        </div>
        <a-button @click="$emit('load')" type="primary" :loading="loading">Load from Path</a-button>
      </div>
      
      <a-divider />
      
      <div style="margin-bottom: 20px">
        <div style="margin-bottom: 10px">Upload Local File:</div>
        <a-upload :customRequest="uploadFile" :showUploadList="false">
          <a-button>
            <upload-outlined />
            Select File
          </a-button>
        </a-upload>
      </div>
    </a-card>

    <a-card title="Available Signals" style="margin-top: 20px">
      <a-list 
        size="small" 
        bordered 
        :data-source="signals" 
        style="height: 400px; overflow: auto"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <span style="font-family: monospace">{{ item }}</span>
            <template #actions>
               <a-button type="link" size="small" @click="copySignal(item)">Copy</a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { UploadOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

defineProps<{
  path: string;
  signals: string[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:path', val: string): void;
  (e: 'load'): void;
  (e: 'upload', options: any): void;
}>();

const uploadFile = (options: any) => {
  emit('upload', options);
};

const copySignal = (signal: string) => {
  navigator.clipboard.writeText(`w['${signal}']`);
  message.success('Copied to clipboard');
};
</script>
