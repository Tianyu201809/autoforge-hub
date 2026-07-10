/**
 * 将文本复制到剪贴板。
 *
 * - 优先使用现代 Clipboard API（navigator.clipboard.writeText）
 * - 如果不支持则降级为传统的 textarea + execCommand('copy') 方式
 * - 添加完善的状态反馈
 *
 * @returns 包含 copyToClipboard 方法的对象
 */
export function useClipboard() {
  async function copyToClipboard(text: string): Promise<boolean> {
    // 1) 尝试现代 Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // Clipboard API 失败（权限不足等），降级到传统方式
      }
    }

    // 2) 降级：textarea + execCommand('copy')
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      textarea.style.width = '1px'
      textarea.style.height = '1px'
      textarea.style.opacity = '0'
      textarea.style.pointerEvents = 'none'
      document.body.appendChild(textarea)
      textarea.select()
      textarea.setSelectionRange(0, textarea.value.length)
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      return false
    }
  }

  return { copyToClipboard }
}
