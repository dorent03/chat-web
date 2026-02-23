<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useChannelStore } from '../../stores/channel.store';
import { useAuthStore } from '../../stores/auth.store';
import UserAvatar from '../user/UserAvatar.vue';
import UserSearch from '../user/UserSearch.vue';
import type { User, MemberRole } from '../../types';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const channelStore = useChannelStore();
const authStore = useAuthStore();

const channelName = ref(channelStore.activeChannel?.name || '');
const channelDescription = ref(channelStore.activeChannel?.description || '');
const error = ref('');
const isSaving = ref(false);
const activeTab = ref<'settings' | 'members'>('settings');

const currentUserMembership = computed(() =>
  channelStore.members.find((m) => m.id === authStore.user?.id)
);

const isAdminOrOwner = computed(() =>
  channelStore.activeChannel?.creator_id === authStore.user?.id ||
  currentUserMembership.value?.role === 'owner' ||
  currentUserMembership.value?.role === 'admin'
);

onMounted(async () => {
  if (channelStore.activeChannelId) {
    await channelStore.fetchMembers(channelStore.activeChannelId);
  }
});

async function handleSave() {
  if (!channelStore.activeChannelId) return;

  error.value = '';
  isSaving.value = true;

  try {
    await channelStore.updateChannel(channelStore.activeChannelId, {
      name: channelName.value.trim(),
      description: channelDescription.value.trim(),
    });
    emit('close');
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { error?: string } } };
    error.value = axiosError.response?.data?.error || 'Failed to update channel';
  } finally {
    isSaving.value = false;
  }
}

async function handleKick(user: User & { role: MemberRole }) {
  if (!channelStore.activeChannelId) return;
  if (!confirm(`Remove ${user.username} from this channel?`)) return;

  try {
    await channelStore.kickMember(channelStore.activeChannelId, user.id);
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { error?: string } } };
    error.value = axiosError.response?.data?.error || 'Failed to kick member';
  }
}

async function handleAddMember(user: User) {
  if (!channelStore.activeChannelId) return;

  try {
    await channelStore.addMember(channelStore.activeChannelId, user.id);
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { error?: string } } };
    error.value = axiosError.response?.data?.error || 'Failed to add member';
  }
}

async function handleDelete() {
  if (!channelStore.activeChannelId) return;
  if (!confirm('Are you sure you want to delete this channel? This cannot be undone.')) return;

  try {
    await channelStore.deleteChannel(channelStore.activeChannelId);
    emit('close');
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { error?: string } } };
    error.value = axiosError.response?.data?.error || 'Failed to delete channel';
  }
}

function getRoleBadgeClass(role: MemberRole): string {
  switch (role) {
    case 'owner': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    default: return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400';
  }
}

function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'last seen unknown';
  return `last seen ${new Date(lastSeen).toLocaleString()}`;
}

function getMemberLastSeen(member: User & { role: MemberRole }): string | null {
  return (member as User & { last_seen_at?: string | null }).last_seen_at || null;
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" @click="emit('close')" />

    <div class="relative card w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
        <h2 class="text-lg font-semibold text-surface-900 dark:text-white">
          Channel Settings
        </h2>
        <button
          class="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
          @click="emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-surface-200 dark:border-surface-700">
        <button
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'settings'
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-surface-500 hover:text-surface-700'"
          @click="activeTab = 'settings'"
        >
          Settings
        </button>
        <button
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'members'
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-surface-500 hover:text-surface-700'"
          @click="activeTab = 'members'"
        >
          Members ({{ channelStore.members.length }})
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <!-- Settings tab -->
        <div v-if="activeTab === 'settings'" class="space-y-4">
          <div
            v-if="!isAdminOrOwner"
            class="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 p-3 rounded-lg"
          >
            You have read-only access. Only channel owner/admin can edit settings.
          </div>

          <div>
            <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Channel Name
            </label>
            <input
              v-model="channelName"
              type="text"
              class="input-field"
              :disabled="!isAdminOrOwner"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Description
            </label>
            <textarea
              v-model="channelDescription"
              class="input-field"
              rows="3"
              :disabled="!isAdminOrOwner"
            />
          </div>

          <div v-if="error" class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {{ error }}
          </div>

          <div v-if="isAdminOrOwner" class="flex justify-between">
            <button
              v-if="currentUserMembership?.role === 'owner'"
              class="btn-danger text-sm"
              @click="handleDelete"
            >
              Delete Channel
            </button>
            <button :disabled="isSaving" class="btn-primary text-sm ml-auto" @click="handleSave">
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <!-- Members tab -->
        <div v-if="activeTab === 'members'" class="space-y-2">
          <div class="mb-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-700/40">
            <template v-if="channelStore.activeChannel?.type === 'private' && isAdminOrOwner">
              <div class="text-xs font-medium text-surface-500 mb-2">Add member to private channel</div>
              <UserSearch @select="handleAddMember" />
            </template>
            <template v-else-if="channelStore.activeChannel?.type === 'private' && !isAdminOrOwner">
              <div class="text-xs text-amber-700 dark:text-amber-300">
                Only channel owner/admin can invite members.
              </div>
            </template>
            <template v-else>
              <div class="text-xs text-surface-500">
                Public channels do not need manual invites. Users can join from Public Channels.
              </div>
            </template>
          </div>

          <div
            v-for="member in channelStore.members"
            :key="member.id"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700/50"
          >
            <div class="flex items-center gap-3">
              <UserAvatar
                :username="member.username"
                :avatar-url="member.avatar_url"
                :user-id="member.id"
                :size="32"
                show-status
              />
              <div>
                <div class="text-sm font-medium text-surface-900 dark:text-white">
                  {{ member.username }}
                </div>
                <div class="text-xs text-surface-500">
                  {{ member.status === 'online' ? 'online' : formatLastSeen(getMemberLastSeen(member)) }}
                </div>
                <span
                  class="text-xs px-1.5 py-0.5 rounded-full"
                  :class="getRoleBadgeClass(member.role)"
                >
                  {{ member.role }}
                </span>
              </div>
            </div>

            <button
              v-if="isAdminOrOwner && member.id !== authStore.user?.id && member.role !== 'owner'"
              class="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              @click="handleKick(member)"
            >
              Kick
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
