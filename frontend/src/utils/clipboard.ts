/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否复制成功
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  // 检查navigator.clipboard是否可用
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("使用Clipboard API复制失败:", err);
      return fallbackCopyToClipboard(text);
    }
  } else {
    // 使用备用方法
    return fallbackCopyToClipboard(text);
  }
};

/**
 * 备用复制方法，使用document.execCommand
 * @param text 要复制的文本
 * @returns 是否复制成功
 */
const fallbackCopyToClipboard = (text: string): boolean => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("备用复制方法失败:", err);
    return false;
  }
};
