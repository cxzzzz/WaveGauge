import { defineStore } from 'pinia';

export type ZoomRange = {
  start: number;
  end: number;
};

export type TabState = {
  zoom: ZoomRange;
  wavePath: string;
  sampleRate: number;
};

type State = {
  baselineTabId: string;
  tabs: Record<string, TabState>;
};

export const useAnalysisStore = defineStore('analysis', {
  state: (): State => ({
    baselineTabId: '',
    tabs: {}
  }),
  actions: {
    addTab(id: string) {
      this.tabs[id] = {
        zoom: { start: 0, end: Number.MAX_SAFE_INTEGER},
        wavePath: '',
        sampleRate: 1
      };
    },
    removeTab(id: string) {
      delete this.tabs[id];
      if (this.baselineTabId === id) {
        this.baselineTabId = '';
      }
    },
    toggleBaselineTab(id: string) {
      this.baselineTabId = this.baselineTabId === id ? '' : id;
    }
  }
});
