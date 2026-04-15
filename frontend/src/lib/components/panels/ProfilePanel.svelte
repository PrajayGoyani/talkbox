<script lang="ts">
  import { authStore } from "../../state/auth.svelte";
  import { API_ROOT } from "../../config";
  import { tooltip, tooltipStore } from "../../state/tooltip.svelte";
  import Icon from "../ui/Icon.svelte";

  let editingName = $state(false);
  let nameInput = $state(authStore.user?.name || "");
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let saveSuccess = $state(false);

  // Avatar upload
  let avatarInput: HTMLInputElement | undefined = $state();
  let avatarPreview = $state<string | null>(null);
  let uploadingAvatar = $state(false);
  let usernameCopied = $state(false);
  let emailCopied = $state(false);

  const displayName = $derived(
    authStore.user?.name || authStore.user?.username || "",
  );

  const resolvedAvatarUrl = $derived.by(() => {
    const url = authStore.user?.avatarUrl;
    if (!url) return null;
    if (url.startsWith("/uploads/")) return `${API_ROOT}${url}`;
    if (url.startsWith("http://localhost:3000/uploads/")) {
      return url.replace("http://localhost:3000", API_ROOT);
    }
    return url;
  });

  /** Frontend sanitize: letters, spaces, hyphens, apostrophes only. Capitalize words. */
  function sanitizeName(val: string): string {
    return (
      val
        .trim()
        // .replace(/[^a-zA-Z\s\-']/g, "") // Note: keep for future reference
        // Allow Unicode letters, spaces, hyphens, and apostrophes
        .replace(/[^\p{L}\s\-']/gu, "")
        .replace(/\s+/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    );
  }

  const handleSaveName = async () => {
    saveError = null;
    saveSuccess = false;
    const sanitized = nameInput.trim() ? sanitizeName(nameInput) : undefined;

    if (sanitized && (sanitized.length < 2 || sanitized.length > 50)) {
      saveError = "Name must be 2-50 characters";
      return;
    }

    saving = true;
    try {
      await authStore.updateProfile({ name: sanitized || null });
      saveSuccess = true;
      editingName = false;
      setTimeout(() => (saveSuccess = false), 3000);
    } catch (e: unknown) {
      saveError = (e as Error).message;
    } finally {
      saving = false;
    }
  };

  const handleAvatarSelect = () => {
    avatarInput?.click();
  };

  const handleAvatarChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      saveError = "Please select an image file";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      saveError = "Image must be under 5MB";
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      avatarPreview = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Upload
    uploadingAvatar = true;
    saveError = null;
    try {
      await authStore.updateAvatar(file);
    } catch (e: unknown) {
      saveError = (e as Error).message;
      avatarPreview = null;
    } finally {
      uploadingAvatar = false;
    }
  };

  const startEditName = () => {
    nameInput = authStore.user?.name || "";
    editingName = true;
    saveError = null;
  };

  const cancelEditName = () => {
    editingName = false;
    nameInput = authStore.user?.name || "";
    saveError = null;
  };

  const handleCopyUsername = (e: MouseEvent) => {
    if (!authStore.user?.username) return;
    const textToCopy = `@${authStore.user.username}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      tooltipStore.showTemporary(
        "Username copied",
        e.currentTarget as HTMLElement,
      );
      usernameCopied = true;
      setTimeout(() => (usernameCopied = false), 2000);
    });
  };

  const handleCopyEmail = (e: MouseEvent) => {
    if (!authStore.user?.email) return;
    navigator.clipboard.writeText(authStore.user.email).then(() => {
      tooltipStore.showTemporary(
        "Email copied",
        e.currentTarget as HTMLElement,
      );
      emailCopied = true;
      setTimeout(() => (emailCopied = false), 2000);
    });
  };
</script>

<div class="h-full flex flex-col">
  <div class="panel-header">
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
      Profile
    </h2>
  </div>

  <div class="p-6 flex flex-col gap-6 overflow-y-auto">
    <!-- Avatar Section -->
    <div class="flex justify-center">
      <button
        class="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center relative overflow-hidden shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 border-none p-0"
        onclick={handleAvatarSelect}
        onkeydown={(e) =>
          (e.key === "Enter" || e.key === " ") && handleAvatarSelect()}
        aria-label="Change avatar"
      >
        {#if avatarPreview || resolvedAvatarUrl}
          <img
            src={avatarPreview || resolvedAvatarUrl}
            alt="Avatar"
            class="w-full h-full object-cover"
          />
        {:else}
          <span class="text-3xl font-bold text-white"
            >{displayName[0]?.toUpperCase() || "?"}</span
          >
        {/if}
        <div
          class="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            ></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        {#if uploadingAvatar}
          <div
            class="absolute inset-0 bg-black/60 flex items-center justify-center"
          >
            <span
              class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
            ></span>
          </div>
        {/if}
      </button>
      <input
        type="file"
        bind:this={avatarInput}
        onchange={handleAvatarChange}
        accept="image/*"
        class="hidden"
      />
    </div>

    <!-- User Info -->
    <div class="flex flex-col gap-5">
      <!-- Display Name -->
      <div class="flex flex-col gap-1.5">
        <label
          for="display-name-input"
          class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
          >Display Name</label
        >
        {#if editingName}
          <div class="flex gap-2 items-center">
            <input
              id="display-name-input"
              type="text"
              bind:value={nameInput}
              placeholder="Enter your display name"
              maxlength="50"
              class="input-field flex-1 py-2! px-3! text-sm!"
            />
            <button
              class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center transition-all disabled:opacity-40 active:scale-90"
              onclick={handleSaveName}
              disabled={saving}
              aria-label="Save name"
            >
              {#if saving}
                <span
                  class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
                ></span>
              {:else}
                ✓
              {/if}
            </button>
            <button
              class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center transition-all active:scale-90"
              onclick={cancelEditName}
              aria-label="Cancel editing">✕</button
            >
          </div>
        {:else}
          <div class="flex items-center justify-between gap-2">
            <span
              id="display-name-value"
              class="text-sm text-slate-900 dark:text-slate-100 wrap-break-word"
              >{authStore.user?.name || "Not set"}</span
            >
            <button
              class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-600/10 transition-all active:scale-90"
              onclick={startEditName}
              aria-label="Edit display name"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                ></path>
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                ></path>
              </svg>
            </button>
          </div>
        {/if}
      </div>

      <!-- Username (read-only) -->
      <div class="flex flex-col gap-1.5">
        <label
          for="username-display"
          class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
          >Username</label
        >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              id="username-display"
              class="font-mono text-xs text-indigo-600 dark:text-indigo-400"
              >@{authStore.user?.username}</span
            >
            <button
              use:tooltip={"Copy username"}
              onclick={handleCopyUsername}
              class="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-600/10 transition-all active:scale-95 flex items-center justify-center"
              aria-label="Copy username"
            >
              <Icon
                name={usernameCopied ? "check" : "copy"}
                class="w-3 h-3 {usernameCopied ? 'text-emerald-500' : ''}"
                stroke-width={usernameCopied ? 3 : 2}
              />
            </button>
          </div>
          <span
            class="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded"
            >Read-only</span
          >
        </div>
      </div>

      <!-- Email (read-only) -->
      <div class="flex flex-col gap-1.5">
        <label
          for="email-display"
          class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
          >Email</label
        >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              id="email-display"
              class="text-sm text-slate-900 dark:text-slate-100"
              >{authStore.user?.email}</span
            >
            <button
              use:tooltip={"Copy email"}
              onclick={handleCopyEmail}
              class="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-600/10 transition-all active:scale-95 flex items-center justify-center"
              aria-label="Copy email"
            >
              <Icon
                name={emailCopied ? "check" : "copy"}
                class="w-3 h-3 {emailCopied ? 'text-emerald-500' : ''}"
                stroke-width={emailCopied ? 3 : 2}
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    {#if saveError}
      <div class="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">
        {saveError}
      </div>
    {/if}
    {#if saveSuccess}
      <div
        class="text-xs text-emerald-500 bg-emerald-500/10 p-2 rounded-lg animate-in fade-in duration-300"
      >
        Profile updated successfully!
      </div>
    {/if}
  </div>
</div>
