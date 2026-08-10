<script setup lang="ts">
import { ref, onMounted } from 'vue';

const orders = ref<Array<{ id: string; totalCents: number }>>([]);

onMounted(async () => {
  const response = await fetch('/api/orders');
  orders.value = await response.json();
});
</script>

<template>
  <ul>
    <li v-for="order in orders" :key="order.id">{{ order.totalCents }}</li>
  </ul>
</template>
