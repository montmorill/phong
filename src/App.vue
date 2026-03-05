<script setup lang="ts">
import NavBrand from '@/components/NavBrand.vue'
import NavUser from '@/components/NavUser.vue'
import { user } from '@/lib/api'
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <header class="h-16 px-8 border-b w-full flex justify-between items-center select-none">
      <NavBrand />
      <NavUser v-if="user" v-bind="user" />
    </header>
    <main class="h-[calc(100vh-4em)] overflow-y-scroll flex flex-col items-center">
      <RouterView />
    </main>
  </div>
</template>
