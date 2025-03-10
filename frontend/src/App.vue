<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStore } from './helpers/entity.helper';

const userStore = useStore('user');

const recordName = ref('');

const records = computed(() => userStore.listRecords().value);

const createRecord = async () => {
  userStore.save({ name: recordName.value });
};
</script>

<template>
  <h5>Users:</h5>
  <ul>
    <li v-for="record in records" :key="record.id">{{ record.name }}</li>
  </ul>
  <form @submit.prevent="createRecord">
    <input v-model="recordName" placeholder="Enter new record" />
    <button type="submit">Create</button>
  </form>
</template>
