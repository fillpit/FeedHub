import type { RouteRecordRaw } from "vue-router";
const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/Home.vue"),
    redirect: "/website-rss",
    children: [
      {
        path: "/website-rss",
        name: "website-rss",
        component: () => import("@/views/WebsiteRss.vue"),
      },
      {
        path: "/setting",
        name: "setting",
        component: () => import("@/views/Setting.vue"),
      },
      {
        path: "/template-management",
        name: "template-management",
        component: () => import("@/views/TemplateManagement.vue"),
      },
      {
        path: "/auth-credential",
        name: "auth-credential",
        component: () => import("@/views/AuthCredentialManagement.vue"),
      },
      {
        path: "/custom-route",
        name: "custom-route",
        component: () => import("@/views/CustomRoute.vue"),
      },
    ],
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/pc/Login.vue"),
  },
];

export default routes;
