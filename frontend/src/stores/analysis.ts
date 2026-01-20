import { defineStore } from 'pinia';

type ZoomRange = {
  start: number;
  end: number;
};

type State = {
  baselineTabId: string;
  zoom: Record<string, ZoomRange>;
  wavePath: Record<string, string>;
  sampleRate: Record<string, number>;
};

export const useAnalysisStore = defineStore('analysis', {
  state: (): State => ({
    baselineTabId: '',
    zoom: {},
    wavePath: {},
    sampleRate: {}
  }),
  actions: {
    setBaselineTab(id: string) {
      this.baselineTabId = this.baselineTabId === id ? '' : id;
    },
    ensureTab(id: string) {
      if (!this.zoom[id]) {
        this.zoom[id] = { start: 0, end: 100 };
      }
      if (this.wavePath[id] === undefined) {
        this.wavePath[id] = '';
      }
      if (this.sampleRate[id] === undefined) {
        this.sampleRate[id] = 1;
      }
    },
    setWavePath(id: string, path: string) {
      this.ensureTab(id);
      this.wavePath[id] = path;
    },
    getWavePath(id: string): string {
      this.ensureTab(id);
      return this.wavePath[id] ?? '';
    },
    setSampleRate(id: string, rate: number) {
      this.ensureTab(id);
      const numeric = Math.floor(Number(rate));
      this.sampleRate[id] = Number.isFinite(numeric) && numeric >= 1 ? numeric : 1;
    },
    getSampleRate(id: string): number {
      this.ensureTab(id);
      return this.sampleRate[id] ?? 1;
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
