<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import userStore from './pages/user/user.store';

const recordName = ref('');
const records = computed(() => userStore.listRecords().value);

const saveRecord = async () => {
  if (recordName.value === '') return;
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
  <div class="flex flex-center" style="height: 100vh">
    <q-card style="width: 500px">
      <q-card-section>
        <q-toolbar>
          <q-toolbar-title>Users ({{ records.length }})</q-toolbar-title>
        </q-toolbar>
        <q-list bordered v-if="records.length" separator>
          <q-item v-for="record in records" :key="record.id">
            <q-item-section>{{ record.name }}</q-item-section>
            <q-item-section side>
              <q-btn flat round icon="delete" @click="removeRecord(record.id)" color="negative" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="saveRecord">
          <q-input v-model="recordName" placeholder="Enter user name" />
          <q-btn type="submit" color="primary" label="Create" class="q-mt-md" />
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>
