import { defineStore } from "pinia";

interface StoreType {
  scrollTop: boolean;
}

export const useStore = defineStore("global", {
  state: (): StoreType => ({
    scrollTop: true,
  }),

  actions: {
    setScrollTop(top: boolean) {
      this.scrollTop = top;
    },
  },
});
