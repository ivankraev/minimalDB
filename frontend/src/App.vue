<script setup lang="ts">
import { ref, computed } from 'vue';
import userStore from './pages/user/user.store';
import buildStore from './pages/build/build.store';

const record = ref({ name: '', roles: ['Guest'], email: '' });
const users = computed(() => userStore.filterRecords({}, { sort: { name: -1 } }).value);
const builds = computed(() => buildStore.listRecords().value);
const usersCount = computed(() => userStore.countRecords().value);

const saveUser = async () => {
  const noReactive = userStore.filterRecords({}, { reactive: false });
  console.log(noReactive);
  if (record.value.name === '') return;
  userStore.save(record.value);
  record.value = { name: '', roles: ['Guest'], email: '' };
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
          <q-toolbar-title>Users ({{ usersCount }})</q-toolbar-title>
        </q-toolbar>
        <q-list bordered v-if="users.length" separator>
          <q-item v-for="record in users" :key="record.id">
            <q-item-section>
              <q-item-label>{{ record.name }}</q-item-label>
              <q-item-label caption>{{ record.email }}</q-item-label>
              <q-item-label>{{ record.roles.join(', ') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat round icon="delete" @click="removeUser(record.id)" color="negative" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="saveUser">
          <q-input v-model="record.name" placeholder="Enter user name" />
          <q-input v-model="record.email" placeholder="Enter user email" class="q-mt-md" />
          <q-select
            v-model="record.roles"
            :options="['Admin', 'User', 'Guest']"
            multiple
            placeholder="Select roles"
            class="q-mt-md"
          />
          <q-btn type="submit" color="primary" label="Create" class="q-mt-md" />
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>
