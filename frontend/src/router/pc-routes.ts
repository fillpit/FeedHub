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
        path: "/auth-credential",
        name: "auth-credential",
        component: () => import("@/views/AuthCredentialManagement.vue"),
      },
      {
          path: "/dynamic-route",
          name: "dynamic-route",
          component: () => import("@/views/DynamicRoute.vue"),
        },
      {
        path: "/npm-package",
        name: "npm-package",
        component: () => import("@/views/PackageManagement.vue"),
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
