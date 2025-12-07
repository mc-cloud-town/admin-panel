<template>
  <div class="space-y-6 flex-1 flex flex-col">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-3">
          Minecraft 伺服器管理
          <UBadge
            v-if="!pending && serversData && serversData.total > 0"
            size="lg"
            variant="subtle"
          >
            {{ serversData.total }} 台
          </UBadge>
        </h1>
        <p class="text-gray-500 mt-1">管理所有 Minecraft 伺服器</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        size="lg"
        label="新增伺服器"
        @click="openCreateModal"
      />
    </div>

    <UCard class="flex-1">
      <template #header>
        <div class="flex justify-between items-center gap-4">
          <h2 class="text-xl font-semibold">伺服器列表</h2>
          <div class="flex gap-3 items-center">
            <div class="relative">
              <UInput
                v-model="searchQuery"
                placeholder="搜尋伺服器..."
                icon="i-heroicons-magnifying-glass"
                class="w-64"
              />
              <UButton
                v-if="searchQuery"
                icon="i-heroicons-x-mark"
                size="xs"
                variant="ghost"
                class="absolute right-2 top-1/2 -translate-y-1/2"
                @click="searchQuery = ''"
              />
            </div>
            <UButton
              icon="i-heroicons-arrow-path"
              variant="outline"
              :loading="pending"
              @click="() => refreshServers()"
            />
          </div>
        </div>
      </template>

      <div
        v-if="pending"
        class="flex flex-col items-center justify-center py-16"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin text-4xl text-primary mb-3"
        />
        <p class="text-gray-500">載入中...</p>
      </div>
      <div
        v-else-if="error"
        class="flex flex-col items-center justify-center py-16"
      >
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="text-5xl text-red-500 mb-3"
        />
        <p class="text-lg font-medium text-red-600">載入失敗</p>
        <p class="text-sm text-gray-500 mt-1">{{ error.message }}</p>
      </div>
      <div
        v-else-if="filteredServers.length === 0"
        class="flex flex-col items-center justify-center py-16"
      >
        <UIcon
          :name="
            searchQuery
              ? 'i-heroicons-magnifying-glass'
              : 'i-heroicons-server-stack'
          "
          class="text-6xl text-gray-300 mb-4"
        />
        <p class="text-lg font-medium text-gray-600">
          {{ searchQuery ? '沒有符合條件的伺服器' : '尚未新增任何伺服器' }}
        </p>
        <p v-if="!searchQuery" class="text-sm text-gray-400 mt-2">
          點擊下方按鈕開始建立第一台伺服器
        </p>
        <UButton
          v-if="!searchQuery"
          icon="i-heroicons-plus"
          size="lg"
          class="mt-4"
          @click="openCreateModal"
        >
          新增伺服器
        </UButton>
      </div>
      <UTable
        v-else
        sticky
        :data="servers"
        :columns="columns"
        :ui="{
          tr: 'rounded-md hover:bg-gray-800 transition-colors duration-100',
        }"
      >
        <template #name-cell="{ row }">
          <div>
            <div class="font-medium">
              {{ row.original.name }}
            </div>
            <div v-if="row.original.description" class="text-sm text-gray-500">
              {{ row.original.description }}
            </div>
          </div>
        </template>

        <template #ipAddress-cell="{ row }">
          <div class="flex items-center gap-2 group">
            <UIcon name="i-heroicons-server" class="text-gray-400" />
            <code
              class="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-700"
            >
              {{ row.original.ipAddress }}:{{ row.original.port }}
            </code>
            <UButton
              icon="i-heroicons-clipboard"
              size="xs"
              variant="ghost"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click="copyServerAddress(row.original)"
            />
          </div>
        </template>

        <template #action-cell="{ row }">
          <UDropdownMenu :items="getDropdownActions(row.original)">
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              aria-label="更多操作"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="isModalOpen" :title="modalTitle">
      <template #body>
        <UForm
          :state="formState"
          :schema="formSchema"
          class="space-y-4 flex flex-col >w-full"
          @submit="handleSubmit"
        >
          <UFormField name="name" label="伺服器名稱" required>
            <UInput
              v-model="formState.name"
              placeholder="輸入伺服器名稱"
              icon="i-heroicons-server-stack"
            />
          </UFormField>

          <UFormField name="description" label="描述">
            <UTextarea
              v-model="formState.description"
              placeholder="輸入伺服器描述（選填）"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField
              name="ipAddress"
              label="IP 位址"
              required
              class="col-span-2 sm:col-span-1"
            >
              <UInput
                v-model="formState.ipAddress"
                placeholder="127.0.0.1"
                icon="i-heroicons-globe-alt"
              />
            </UFormField>

            <UFormField
              name="port"
              label="連接埠"
              required
              class="col-span-2 sm:col-span-1"
            >
              <UInput
                v-model="formState.port"
                type="number"
                placeholder="25565"
                icon="i-heroicons-server"
                :min="1"
                :max="65535"
              />
            </UFormField>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              @click="closeModal"
            >
              取消
            </UButton>
            <UButton type="submit" :loading="submitting">
              {{ isEditMode ? '更新' : '建立' }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="isDeleteModalOpen" title="確認刪除伺服器">
      <template #body>
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="text-xl text-red-600 dark:text-red-400"
              />
            </div>
            <div class="flex-1">
              <p class="text-base font-medium text-gray-900 dark:text-gray-100">
                確定要刪除伺服器
                <span class="font-semibold text-red-600">
                  {{ deleteTarget?.name }}
                </span>
                嗎？
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
                此操作無法復原，刪除後伺服器資料將永久消失。
              </p>
            </div>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="close">
            取消
          </UButton>
          <UButton color="error" :loading="deleting" @click="handleDelete">
            確認刪除
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type { InferOutput } from 'valibot';
import {
  integer,
  ip,
  maxLength,
  maxValue,
  minLength,
  minValue,
  number,
  object,
  optional,
  pipe,
  string,
} from 'valibot';

import v from '#shared/contracts/locales/valibot-i18n';
import type { MinecraftServerResponse } from '#shared/contracts/minecraft/servers';

definePageMeta({ auth: { only: 'user' } });

const { copy } = useClipboard();
const permissionWrite = usePermission('clipboard-write');
const toast = useToast();

const formSchema = object({
  name: pipe(string(v.string()), minLength(1, v.minLength(1)), maxLength(100)),
  description: optional(string()),
  ipAddress: pipe(string(v.string()), ip(v.ip())),
  port: pipe(
    number(v.number()),
    integer(v.integer()),
    minValue(1, v.minValue(1)),
    maxValue(65535, v.maxValue(65535))
  ),
});

type FormState = InferOutput<typeof formSchema>;

const columns: TableColumn<MinecraftServerResponse>[] = [
  { accessorKey: 'name', header: '伺服器名稱' },
  { accessorKey: 'ipAddress', header: '連線位址' },
  { id: 'action', header: '操作' },
];

const {
  data: serversData,
  pending,
  error,
  refresh: refreshServers,
} = await useFetch<{
  // TODO use interface (server & client)
  total: number;
  servers: MinecraftServerResponse[];
}>('/api/minecraft/servers', { method: 'GET' });

const servers = computed<MinecraftServerResponse[]>(
  () => serversData.value?.servers ?? []
);

// TODO from request
const searchQuery = ref('');
const filteredServers = computed(() => {
  if (!searchQuery.value) return servers.value;
  const query = searchQuery.value.toLowerCase();
  return servers.value.filter(
    (server: MinecraftServerResponse) =>
      server.name.toLowerCase().includes(query) ||
      server.description?.toLowerCase().includes(query) ||
      server.ipAddress.toLowerCase().includes(query) ||
      server.port.toString().includes(query)
  );
});

const isModalOpen = ref(false);
const isEditMode = ref(false);
const editingServerId = ref<string | null>(null);
const submitting = ref(false);

const formState = ref<FormState>({
  name: '',
  description: '',
  ipAddress: '',
  port: 25565,
});

const modalTitle = computed(() =>
  isEditMode.value ? '編輯伺服器' : '新增伺服器'
);

const openCreateModal = () => {
  isEditMode.value = false;
  editingServerId.value = null;
  formState.value = { name: '', description: '', ipAddress: '', port: 25565 };
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  isEditMode.value = false;
  editingServerId.value = null;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (isEditMode.value && editingServerId.value) {
      await $fetch(`/api/minecraft/servers/${editingServerId.value}`, {
        method: 'PATCH',
        body: {
          name: formState.value.name,
          description: formState.value.description || undefined,
          ipAddress: formState.value.ipAddress,
          port: formState.value.port,
        },
      });

      toast.add({
        title: '更新成功',
        description: `伺服器 ${formState.value.name} 已更新`,
        color: 'success',
      });
    } else {
      await $fetch('/api/minecraft/servers', {
        method: 'POST',
        body: {
          name: formState.value.name,
          description: formState.value.description || undefined,
          ipAddress: formState.value.ipAddress,
          port: formState.value.port,
        },
      });

      toast.add({
        title: '建立成功',
        description: `伺服器 ${formState.value.name} 已建立`,
        color: 'success',
      });
    }

    closeModal();
    await refreshServers();
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string };

    toast.add({
      title: isEditMode.value ? '更新失敗' : '建立失敗',
      description: error.data?.message || error.message || '發生未知錯誤',
      color: 'error',
    });
  } finally {
    submitting.value = false;
  }
};

const isDeleteModalOpen = ref(false);
const deleteTarget = ref<MinecraftServerResponse | null>(null);
const deleting = ref(false);

const getDropdownActions = (
  server: MinecraftServerResponse
): DropdownMenuItem[][] => {
  return [
    [
      {
        label: '複製連線位址',
        icon: 'i-heroicons-clipboard',
        onSelect: () => copyServerAddress(server),
      },
      {
        label: '複製伺服器 ID',
        icon: 'i-heroicons-identification',
        onSelect: async () => {
          await copy(server.id.toString());

          if (permissionWrite.value === 'denied') {
            toast.add({
              title: '無法複製到剪貼簿',
              description: '請確認瀏覽器設定允許剪貼簿寫入權限',
              color: 'error',
              icon: 'i-heroicons-x-circle',
            });
          } else {
            toast.add({
              title: '已複製 ID',
              description: server.id.toString(),
              color: 'success',
              icon: 'i-heroicons-clipboard-document-check',
            });
          }
        },
      },
    ],
    [
      {
        label: '編輯',
        icon: 'i-lucide-edit',
        onSelect: () => {
          isEditMode.value = true;
          editingServerId.value = server.id;
          formState.value = {
            name: server.name,
            description: server.description || '',
            ipAddress: server.ipAddress,
            port: server.port,
          };
          isModalOpen.value = true;
        },
      },
      {
        label: '刪除',
        icon: 'i-lucide-trash',
        color: 'error',
        onSelect: () => {
          deleteTarget.value = server;
          isDeleteModalOpen.value = true;
        },
      },
    ],
  ];
};

const copyServerAddress = async (server: MinecraftServerResponse) => {
  const address = `${server.ipAddress}:${server.port}`;
  await copy(address);

  if (permissionWrite.value === 'denied') {
    toast.add({
      title: '無法複製到剪貼簿',
      description: '請確認瀏覽器設定允許剪貼簿寫入權限',
      color: 'error',
      icon: 'i-heroicons-x-circle',
    });
  } else {
    toast.add({
      title: '已複製到剪貼簿',
      description: address,
      color: 'success',
      icon: 'i-heroicons-clipboard-document-check',
    });
  }
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;

  deleting.value = true;
  try {
    await $fetch(`/api/minecraft/servers/${deleteTarget.value.id}`, {
      method: 'DELETE',
    });

    toast.add({
      title: '刪除成功',
      description: `伺服器 ${deleteTarget.value.name} 已刪除`,
      color: 'success',
    });
    isDeleteModalOpen.value = false;
    deleteTarget.value = null;

    await refreshServers();
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string };

    toast.add({
      title: '刪除失敗',
      description: error.data?.message || error.message || '發生未知錯誤',
      color: 'error',
    });
  } finally {
    deleting.value = false;
  }
};
</script>
