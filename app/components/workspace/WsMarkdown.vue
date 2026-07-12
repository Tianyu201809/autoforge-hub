<script setup lang="ts">
import { marked } from "marked"
import DOMPurify from "dompurify"

const props = defineProps<{ source: string }>()

const html = computed(() => {
  if (!import.meta.client) return ""
  const raw = marked.parse(props.source || "", { async: false }) as string
  return DOMPurify.sanitize(raw)
})
</script>

<template>
  <div class="md-body" v-html="html" />
</template>

<style scoped>
.md-body {
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--text);
  word-break: break-word;
}
.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3) {
  margin: 1em 0 0.4em;
  font-weight: 700;
  color: var(--text);
}
.md-body :deep(p),
.md-body :deep(ul),
.md-body :deep(ol) {
  margin: 0.5em 0;
}
.md-body :deep(a) {
  color: var(--accent);
}
.md-body :deep(code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--bg-muted);
  font-size: 0.9em;
}
.md-body :deep(pre) {
  padding: 12px;
  overflow: auto;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px solid var(--border);
}
.md-body :deep(pre code) {
  padding: 0;
  background: transparent;
}
.md-body :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 12px;
  border-left: 3px solid var(--border-strong);
  color: var(--text-muted);
}
</style>
