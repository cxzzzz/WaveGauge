import { defineStore } from 'pinia';

type ZoomRange = {
  start: number;
  end: number;
};

type State = {
  baselineTabId: string;
  zoom: Record<string, ZoomRange>;
};

export const useAnalysisStore = defineStore('analysis', {
  state: (): State => ({
    baselineTabId: '',
    zoom: {}
  }),
  actions: {
    setBaselineTab(id: string) {
      this.baselineTabId = this.baselineTabId === id ? '' : id;
    },
    ensureTab(id: string) {
      if (!this.zoom[id]) {
        this.zoom[id] = { start: 0, end: 100 };
      }
    },
    setZoomStart(id: string, start: number) {
      this.ensureTab(id);
      const current = this.zoom[id];
      if (!current) return;
      current.start = Math.max(0, Math.min(100, start));
    },
    setZoomEnd(id: string, end: number) {
      this.ensureTab(id);
      const current = this.zoom[id];
      if (!current) return;
      current.end = Math.max(0, Math.min(100, end));
    },
    getZoomStart(id: string): number {
      this.ensureTab(id);
      return this.zoom[id]?.start ?? 0;
    },
    getZoomEnd(id: string): number {
      this.ensureTab(id);
      return this.zoom[id]?.end ?? 100;
    }
  }
});
