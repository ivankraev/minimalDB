<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import userStore from './pages/user/user.store';

const recordName = ref('');
const records = computed(() => userStore.listRecords().value);

const createRecord = async () => {
  userStore.save({ name: recordName.value, email: 'test@gmail.com' });
  recordName.value = '';
};

const removeRecord = async (id: string) => {
  userStore.delete(id);
};

// This will be handled by hook
onUnmounted(() => userStore.destroy());
</script>

<template>
  <h5>Users:</h5>
  <ul>
    <li v-for="record in records" :key="record.id">
      {{ record.name }}
      <button @click="removeRecord(record.id)">Delete</button>
    </li>
  </ul>
  <form @submit.prevent="createRecord">
    <input v-model="recordName" placeholder="Enter new record" />
    <button type="submit">Create</button>
  </form>
</template>
