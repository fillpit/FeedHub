import { createRouter, createWebHistory } from "vue-router";
import pcRoutes from "./pc-routes";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...pcRoutes],
});

export default router;
