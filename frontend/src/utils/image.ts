import { useUserSettingStore } from "@/stores/userSetting";
import defaultImage from "@/assets/images/default.png";

export const getProxyImageUrl = (originalUrl: string): string => {
  const userStore = useUserSettingStore();
  if (!originalUrl) return defaultImage;
  return userStore.imagesSource === "proxy"
    ? `/tele-images/?url=${encodeURIComponent(originalUrl)}`
    : originalUrl;
};
