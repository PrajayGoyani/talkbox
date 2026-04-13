<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import { API_BASE } from "../config";
  import Icon from "./Icon.svelte";

  let {
    chatId,
    onClose,
    onMediaClick,
  }: {
    chatId: string;
    onClose: () => void;
    onMediaClick?: (url: string, type: "image" | "video") => void;
  } = $props();

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------
  interface AttachmentItem {
    _id: string;
    senderId: string;
    createdAt: string;
    attachment: {
      kind: "image" | "audio" | "video" | "document" | null;
      url: string | null;
      originalName?: string | null;
      fileSize?: number | null;
    };
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let activeTab: "media" | "docs" = $state("media");
  let isLoading = $state(true);
  let attachments: AttachmentItem[] = $state([]);
  let storageUsed = $state(0);
  let storageLimit = $state(500 * 1024 * 1024);
  let deletingId: string | null = $state(null);
  let error: string | null = $state(null);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const mediaItems = $derived(
    attachments.filter((a) => a.attachment.kind === "image" || a.attachment.kind === "video" || a.attachment.kind === "audio")
  );
  const docItems = $derived(
    attachments.filter((a) => a.attachment.kind === "document")
  );
  const storagePercent = $derived(Math.min(100, (storageUsed / storageLimit) * 100));
  const storageUsedMB = $derived((storageUsed / 1024 / 1024).toFixed(1));
  const storageLimitMB = $derived((storageLimit / 1024 / 1024).toFixed(0));

  // ---------------------------------------------------------------------------
  // Load attachments on mount
  // ---------------------------------------------------------------------------
  $effect(() => {
    void loadAttachments();
  });

  async function loadAttachments() {
    isLoading = true;
    error = null;
    try {
      const resp = await fetch(`${API_BASE}/chat/${chatId}/attachments`, {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error?.message || "Failed to load attachments");
      attachments = result.data.attachments ?? [];
      storageUsed = result.data.storageUsed ?? 0;
      storageLimit = result.data.storageLimit ?? storageLimit;
    } catch (e: any) {
      error = e.message || "Failed to load attachments";
    } finally {
      isLoading = false;
    }
  }

  async function deleteAttachment(messageId: string) {
    if (deletingId) return;
    deletingId = messageId;
    try {
      const resp = await fetch(`${API_BASE}/chat/${chatId}/attachments/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        credentials: "include",
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error?.message || "Delete failed");

      // Update local state immediately
      attachments = attachments.filter((a) => a._id !== messageId);
      storageUsed = result.data.storageUsed;
    } catch (e: any) {
      error = e.message || "Failed to delete attachment";
    } finally {
      deletingId = null;
    }
  }

  function formatSize(bytes?: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatDate(d: string): string {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
  onclick={onClose}
  aria-label="Close gallery"
  role="button"
  tabindex="-1"
></div>

<!-- Drawer -->
<aside
  class="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col animate-in slide-in-from-right duration-300"
>
  <!-- Header -->
  <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
    <div>
      <h2 class="font-bold text-lg text-slate-900 dark:text-white m-0 leading-tight">Media & Files</h2>
      <p class="text-xs text-slate-500 mt-0.5">All shared attachments in this chat</p>
    </div>
    <button
      class="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-95"
      onclick={onClose}
      aria-label="Close"
    >
      <Icon name="close" class="w-5 h-5" />
    </button>
  </div>

  <!-- Storage progress bar -->
  <div class="px-5 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
    <div class="flex justify-between items-center mb-2">
      <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">Storage used</span>
      <span class="text-xs text-slate-500">
        <span class="{storagePercent > 80 ? 'text-rose-500 font-bold' : ''}">{storageUsedMB} MB</span>
        / {storageLimitMB} MB
      </span>
    </div>
    <div class="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500 {storagePercent > 80 ? 'bg-rose-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-indigo-500'}"
        style:width="{storagePercent}%"
      ></div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 px-5 pt-3 pb-0 shrink-0">
    <button
      class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all {activeTab === 'media' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}"
      onclick={() => (activeTab = "media")}
    >
      Media ({mediaItems.length})
    </button>
    <button
      class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all {activeTab === 'docs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}"
      onclick={() => (activeTab = "docs")}
    >
      Docs ({docItems.length})
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-5">
    {#if isLoading}
      <div class="flex flex-col gap-3">
        {#each Array(6) as _}
          <div class="h-14 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse"></div>
        {/each}
      </div>
    {:else if error}
      <div class="flex flex-col items-center justify-center h-40 gap-3 text-center">
        <Icon name="close" class="w-8 h-8 text-rose-500" />
        <p class="text-sm text-slate-500">{error}</p>
        <button class="text-xs text-indigo-600 hover:underline" onclick={() => void loadAttachments()}>Try again</button>
      </div>
    {:else if activeTab === "media"}
      {#if mediaItems.length === 0}
        <div class="flex flex-col items-center justify-center h-40 gap-2 text-center text-slate-400">
          <Icon name="paperclip" class="w-8 h-8 opacity-40" />
          <p class="text-sm">No media shared yet</p>
        </div>
      {:else}
        <!-- Image/video grid -->
        {@const imageVideoItems = mediaItems.filter(a => a.attachment.kind === 'image' || a.attachment.kind === 'video')}
        {#if imageVideoItems.length > 0}
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Photos & Videos</p>
          <div class="grid grid-cols-3 gap-1.5 mb-4">
            {#each imageVideoItems as item (item._id)}
              <div class="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5">
                {#if item.attachment.kind === 'image'}
                  <button
                    class="block w-full h-full"
                    onclick={() => onMediaClick?.(item.attachment.url!, 'image')}
                  >
                    <img src={item.attachment.url!} alt={item.attachment.originalName || "Image"} class="w-full h-full object-cover" />
                  </button>
                {:else}
                  <button
                    class="block w-full h-full flex items-center justify-center bg-black/70"
                    onclick={() => onMediaClick?.(item.attachment.url!, 'video')}
                  >
                    <Icon name="play" class="w-8 h-8 text-white" />
                  </button>
                {/if}
                <!-- Delete overlay -->
                <button
                  class="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 z-10"
                  onclick={() => void deleteAttachment(item._id)}
                  disabled={deletingId === item._id}
                  aria-label="Delete"
                >
                  {#if deletingId === item._id}
                    <span class="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin"></span>
                  {:else}
                    <Icon name="trash" class="w-3 h-3 text-white" />
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Audio list -->
        {@const audioItems = mediaItems.filter(a => a.attachment.kind === 'audio')}
        {#if audioItems.length > 0}
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Audio</p>
          <div class="flex flex-col gap-2 mb-4">
            {#each audioItems as item (item._id)}
              <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl group">
                <div class="w-9 h-9 rounded-lg bg-indigo-600/10 flex items-center justify-center shrink-0">
                  <Icon name="music" class="w-4 h-4 text-indigo-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.attachment.originalName || "Audio"}</p>
                  <p class="text-[10px] text-slate-400">{formatDate(item.createdAt)} · {formatSize(item.attachment.fileSize)}</p>
                  <audio src={item.attachment.url!} controls class="w-full mt-1 h-7"></audio>
                </div>
                <button
                  class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  onclick={() => void deleteAttachment(item._id)}
                  disabled={deletingId === item._id}
                  aria-label="Delete"
                >
                  {#if deletingId === item._id}
                    <span class="w-4 h-4 border border-slate-300 border-t-slate-600 rounded-full animate-spin inline-block"></span>
                  {:else}
                    <Icon name="trash" class="w-4 h-4" />
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    {:else}
      <!-- Docs tab -->
      {#if docItems.length === 0}
        <div class="flex flex-col items-center justify-center h-40 gap-2 text-center text-slate-400">
          <Icon name="document" class="w-8 h-8 opacity-40" />
          <p class="text-sm">No documents shared yet</p>
        </div>
      {:else}
        <div class="flex flex-col gap-2">
          {#each docItems as item (item._id)}
            <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl group hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center shrink-0">
                <Icon name="document" class="w-5 h-5 text-indigo-500" />
              </div>
              <a
                href={item.attachment.url!}
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 min-w-0"
              >
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate hover:text-indigo-600 transition-colors">
                  {item.attachment.originalName || "Document"}
                </p>
                <p class="text-[10px] text-slate-400">
                  {formatDate(item.createdAt)}{item.attachment.fileSize ? ` · ${formatSize(item.attachment.fileSize)}` : ""}
                </p>
              </a>
              <button
                class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                onclick={() => void deleteAttachment(item._id)}
                disabled={deletingId === item._id}
                aria-label="Delete"
              >
                {#if deletingId === item._id}
                  <span class="w-4 h-4 border border-slate-300 border-t-slate-600 rounded-full animate-spin inline-block"></span>
                {:else}
                  <Icon name="trash" class="w-4 h-4" />
                {/if}
              </button>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Refresh footer -->
  <div class="px-5 py-3 border-t border-slate-200 dark:border-white/10 shrink-0">
    <button
      class="w-full py-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1.5"
      onclick={() => void loadAttachments()}
      disabled={isLoading}
    >
      <Icon name="refresh" class="w-3.5 h-3.5 {isLoading ? 'animate-spin' : ''}" />
      Refresh
    </button>
  </div>
</aside>
