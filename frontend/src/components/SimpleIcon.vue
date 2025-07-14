<template>
  <span class="simple-icon" :style="{ color: color, fontSize: size + 'px' }">
    <component :is="iconComponent" v-if="iconComponent" />
    <slot v-else></slot>
  </span>
</template>

<script setup lang="ts">
import { computed, defineProps, h } from 'vue';
import * as SimpleIcons from 'simple-icons';

const props = defineProps({
  // 图标名称，如 'siTwitter', 'siBilibili' 等
  name: {
    type: String,
    required: true
  },
  // 图标颜色，默认继承父元素颜色
  color: {
    type: String,
    default: 'currentColor'
  },
  // 图标大小，单位为像素
  size: {
    type: [Number, String],
    default: 24
  }
});

// 计算图标组件
const iconComponent = computed(() => {
  // 检查图标名称是否存在于 SimpleIcons 中
  if (props.name && props.name in SimpleIcons) {
    // 创建一个内联SVG组件
    return {
      render() {
        const icon = SimpleIcons[props.name as keyof typeof SimpleIcons];
        return h('svg', {
          xmlns: 'http://www.w3.org/2000/svg',
          width: props.size,
          height: props.size,
          viewBox: '0 0 24 24',
          fill: 'currentColor',
          innerHTML: `<path d="${(icon as any).path}"/>`
        });
      }
    };
  }
  return null;
});
</script>

<style scoped>
.simple-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>