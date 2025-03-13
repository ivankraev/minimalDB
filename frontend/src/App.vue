<script setup lang="ts">
import { ref, computed } from 'vue';
import userStore from './pages/user/user.store';
import buildStore from './pages/build/build.store';

const recordName = ref('');
const users = computed(() => userStore.listRecords().value);
const builds = computed(() => buildStore.listRecords().value);

const saveUser = async () => {
  if (recordName.value === '') return;
  userStore.save({ name: recordName.value, email: 'test@gmail.com' });
  recordName.value = '';
};

const removeUser = async (id: string) => {
  userStore.delete(id);
};
</script>

<template>
  <div class="flex flex-center" style="height: 100vh">
    <p style="position: fixed; top: 50px">Builds count: {{ builds.length }}</p>
    <q-card style="width: 500px">
      <q-card-section>
        <q-toolbar>
          <q-toolbar-title>Users ({{ users.length }})</q-toolbar-title>
        </q-toolbar>
        <q-list bordered v-if="users.length" separator>
          <q-item v-for="record in users" :key="record.id">
            <q-item-section>{{ record.name }}</q-item-section>
            <q-item-section side>
              <q-btn flat round icon="delete" @click="removeUser(record.id)" color="negative" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="saveUser">
          <q-input v-model="recordName" placeholder="Enter user name" />
          <q-btn type="submit" color="primary" label="Create" class="q-mt-md" />
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>
