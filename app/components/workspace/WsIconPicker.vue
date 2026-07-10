<script setup lang="ts">
const modelValue = defineModel<string>({ default: 'file-archive' })
const color = defineModel<string | undefined>('color', { default: undefined })

const ICONS = [
  { id: 'file-archive', label: '归档' },
  { id: 'code-2', label: '代码' },
  { id: 'braces', label: '括号' },
  { id: 'terminal', label: '终端' },
  { id: 'zap', label: '闪电' },
  { id: 'wand-2', label: '魔棒' },
  { id: 'server', label: '服务器' },
  { id: 'database', label: '数据库' },
  { id: 'globe', label: '地球' },
  { id: 'cloud', label: '云' },
  { id: 'bot', label: '机器人' },
  { id: 'brain-circuit', label: 'AI' },
  { id: 'paintbrush', label: '画笔' },
  { id: 'palette', label: '调色板' },
  { id: 'chart-bar', label: '图表' },
  { id: 'trending-up', label: '趋势' },
  { id: 'calculator', label: '计算器' },
  { id: 'lock', label: '锁' },
  { id: 'shield', label: '盾牌' },
  { id: 'key', label: '密钥' },
  { id: 'mail', label: '邮件' },
  { id: 'message-square', label: '消息' },
  { id: 'bell', label: '通知' },
  { id: 'calendar', label: '日历' },
  { id: 'settings', label: '设置' },
  { id: 'sliders', label: '滑块' },
  { id: 'cog', label: '齿轮' },
  { id: 'tool', label: '工具' },
  { id: 'wrench', label: '扳手' },
  { id: 'book-open', label: '书本' },
  { id: 'file-text', label: '文档' },
  { id: 'search', label: '搜索' },
  { id: 'star', label: '星星' },
  { id: 'award', label: '奖章' },
  { id: 'flag', label: '旗帜' },
  { id: 'target', label: '目标' },
  { id: 'heart', label: '爱心' },
  { id: 'link', label: '链接' },
  { id: 'share-2', label: '分享' },
]

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#64748b', '#71717a',
]

function toggleColor(c: string) {
  color.value = color.value === c ? undefined : c
}
</script>

<template>
  <div class="icon-picker">
    <label class="icon-picker__label">图标</label>
    <div class="icon-picker__grid">
      <button
        v-for="ic in ICONS"
        :key="ic.id"
        type="button"
        class="icon-picker__btn"
        :class="{ 'icon-picker__btn--active': modelValue === ic.id }"
        :title="ic.label"
        @click="modelValue = ic.id"
      >
        <Icon :name="`lucide:${ic.id}`" size="16" />
      </button>
    </div>

    <label class="icon-picker__label icon-picker__label--mt">图标颜色</label>
    <div class="icon-picker__colors">
      <button
        type="button"
        class="icon-picker__swatch icon-picker__swatch--none"
        :class="{ 'icon-picker__swatch--active': !color }"
        title="默认主题色"
        @click="color = undefined"
      >
        <Icon name="lucide:sparkles" size="12" />
      </button>
      <button
        v-for="c in COLORS"
        :key="c"
        type="button"
        class="icon-picker__swatch"
        :class="{ 'icon-picker__swatch--active': color === c }"
        :style="{ background: c }"
        :title="c"
        @click="toggleColor(c)"
      >
        <Icon v-if="color === c" name="lucide:check" size="12" class="icon-picker__check" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.icon-picker__label {
  display: block;
  margin-bottom: 8px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.icon-picker__label--mt {
  margin-top: 12px;
}

.icon-picker__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.icon-picker__grid::-webkit-scrollbar {
  width: 4px;
}

.icon-picker__grid::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 2px;
}

.icon-picker__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s;
}

.icon-picker__btn:hover {
  background: var(--bg-elevated);
  border-color: var(--border);
  color: var(--text-secondary);
}

.icon-picker__btn--active {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent);
}

.icon-picker__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.icon-picker__swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;
}

.icon-picker__swatch:hover {
  transform: scale(1.15);
}

.icon-picker__swatch--none {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
  color: var(--text-muted);
  border-style: dashed;
}

.icon-picker__swatch--none:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}

.icon-picker__swatch--active {
  border-color: var(--text);
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--text);
}

.icon-picker__swatch--none.icon-picker__swatch--active {
  border-style: solid;
  border-color: var(--accent);
  color: var(--accent);
}

.icon-picker__check {
  color: #fff;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));
}
</style>
