<script setup lang="ts">
import type { HubItem } from '~/types/hub'
import { formatIntegrationLabel, getItemHeroIcon, hubTypeLabels } from '~/utils/hub-icons'

const props = defineProps<{
  item: HubItem
}>()

const heroIcon = computed(() => getItemHeroIcon(props.item))
const primaryIntegration = computed(() => props.item.integrations[0])
const extraIntegrations = computed(() => Math.max(0, props.item.integrations.length - 1))
</script>

<template>
  <article class="card">
    <NuxtLink to="#" class="card__link">
      <div class="card__preview" aria-hidden="true">
        <Icon :name="heroIcon" size="56" class="card__hero-icon" />
      </div>

      <div class="card__body">
        <div class="card__title-row">
          <h3 class="card__title">{{ item.title }}</h3>
          <Icon name="lucide:arrow-up-right" size="16" class="card__arrow" />
        </div>

        <div class="card__footer">
          <div class="card__tags">
            <span class="card__type-pill">{{ hubTypeLabels[item.type] }}</span>
            <span v-if="primaryIntegration" class="card__integration-pill">
              {{ formatIntegrationLabel(primaryIntegration) }}
            </span>
            <span v-if="extraIntegrations > 0" class="card__more-pill">
              +{{ extraIntegrations }}
            </span>
          </div>

          <span v-if="item.verified" class="card__verified">
            <Icon name="lucide:badge-check" size="12" />
            Verified
          </span>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.card:hover {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.card:hover .card__arrow {
  color: var(--accent);
  transform: translate(1px, -1px);
}

.card__link {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: inherit;
}

.card__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 132px;
  padding: 28px 20px;
  background: var(--card-preview-bg);
  border-bottom: 1px solid var(--border);
}

.card__hero-icon {
  color: var(--card-hero-icon);
  opacity: 0.92;
  filter: var(--icon-accent-filter);
}

.card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px 16px;
  flex: 1;
}

.card__title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.card__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  line-height: var(--leading-snug);
  letter-spacing: -0.015em;
  color: var(--text);
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__arrow {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--text-muted);
  transition: color 0.15s, transform 0.15s;
}

.card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  min-width: 0;
}

.card__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.card__type-pill {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1.25;
  color: var(--accent);
  white-space: nowrap;
}

.card__integration-pill {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.25;
  color: var(--text-secondary);
  white-space: nowrap;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__more-pill {
  padding: 3px 6px;
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-muted);
  white-space: nowrap;
}

.card__verified {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid var(--accent-border);
  background: var(--verified-bg);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--verified);
  white-space: nowrap;
}
</style>
