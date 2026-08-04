<template>
    <div class="empty-state">
        <AppIcon :name="icon" :size="48" color="var(--text-tertiary)"/>

        <p class="text-sm" :style="{color:'var(--text-tertiary)'}">{{ text }}</p>
    </div>
</template>

<script setup lang="ts">
import AppIcon from './icons/AppIcon.vue'

withDefaults(defineProps<{
    icon?: string
    text: string
}>(), {
    icon: 'inbox',
})
</script>