import { createRouter, createWebHistory } from "vue-router";
 import pcRoutes from "./pc-routes";
import { Validator } from '../utils/validation';
import { showErrorMessage } from '../utils/request';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...pcRoutes],
});

// 全局前置守卫，应用验证逻辑
router.beforeEach(async (to, from, next) => {
  const validationSchema = to.meta.validationSchema as Record<string, any>;
  if (validationSchema) {
    const validator = new Validator(validationSchema);
    const formData = to.params; // 或者根据实际情况从 to.query 或其他地方获取
    const { isValid, errors } = validator.validate(formData);

    if (!isValid) {
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        showErrorMessage(errors[firstErrorField][0]);
      }
      next(false); // 阻止导航
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
