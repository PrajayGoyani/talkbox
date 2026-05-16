<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";
  import { API_ROOT } from "$lib/config";
  import { routerStore } from "$lib/state/router.svelte";
  import { Route } from "$lib/utils/routes";
  import { authStore } from "$state/auth.svelte";
  import { tooltip, tooltipStore } from "$state/tooltip.svelte";

  let editingName = $state(false);
  let nameInput = $state(authStore.user?.name || "");
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let saveSuccess = $state(false);

  let editingBio = $state(false);
  let bioInput = $state(authStore.user?.bio || "");

  // Avatar upload
  let avatarInput: HTMLInputElement | undefined = $state();
  let avatarPreview = $state<string | null>(null);
  let uploadingAvatar = $state(false);
  let usernameCopied = $state(false);
  let emailCopied = $state(false);

  const displayName = $derived(authStore.user?.name || authStore.user?.username || "");

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

  const handleSaveBio = async () => {
    saveError = null;
    saveSuccess = false;
    const sanitized = bioInput.trim() || null;

    if (sanitized && sanitized.length > 200) {
      saveError = "Bio must be at most 200 characters";
      return;
    }

    saving = true;
    try {
      await authStore.updateProfile({ bio: sanitized });
      saveSuccess = true;
      editingBio = false;
      setTimeout(() => (saveSuccess = false), 3000);
    } catch (e: unknown) {
      saveError = (e as Error).message;
    } finally {
      saving = false;
    }
  };

  const startEditBio = () => {
    bioInput = authStore.user?.bio || "";
    editingBio = true;
    saveError = null;
  };

  const cancelEditBio = () => {
    editingBio = false;
    bioInput = authStore.user?.bio || "";
    saveError = null;
  };

  const handleAvatarSelect = () => {
    if (authStore.isRestricted) return;
    avatarInput?.click();
  };

  const avatarTooltip = $derived(
    authStore.isRestricted ? "Verify email to change avatar" : "Change avatar",
  );

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
      tooltipStore.showTemporary("Username copied", e.currentTarget as HTMLElement);
      usernameCopied = true;
      setTimeout(() => (usernameCopied = false), 2000);
    });
  };

  const handleCopyEmail = (e: MouseEvent) => {
    if (!authStore.user?.email) return;
    navigator.clipboard.writeText(authStore.user.email).then(() => {
      tooltipStore.showTemporary("Email copied", e.currentTarget as HTMLElement);
      emailCopied = true;
      setTimeout(() => (emailCopied = false), 2000);
    });
  };
</script>

<div class="h-full flex flex-col">
  <div class="panel-header">
    <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Profile</h2>
  </div>

  <div class="p-6 flex flex-col gap-6 overflow-y-auto">
    <!-- Avatar Section -->
    <div class="flex justify-center">
      <button
        class={[
          "w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center relative overflow-hidden shadow-xl shadow-indigo-500/20 transition-all border-none p-0",
          authStore.isRestricted ? "opacity-60 cursor-not-allowed grayscale" : "hover:scale-105 active:scale-95",
        ]}
        onclick={handleAvatarSelect}
        onkeydown={(e) => (e.key === "Enter" || e.key === " ") && handleAvatarSelect()}
        aria-label={avatarTooltip}
        use:tooltip={avatarTooltip}
      >
        {#if avatarPreview || resolvedAvatarUrl}
          <img src={avatarPreview || resolvedAvatarUrl} alt="Avatar" class="w-full h-full object-cover" />
        {:else}
          <span class="text-3xl font-bold text-white">{displayName[0]?.toUpperCase() || "?"}</span>
        {/if}
        {#if !authStore.isRestricted}
          <div
            class="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
          >
            <Icon name="camera" class="w-5 h-5" />
          </div>
        {/if}
        {#if uploadingAvatar}
          <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></span>
          </div>
        {/if}
      </button>
      <input type="file" bind:this={avatarInput} onchange={handleAvatarChange} accept="image/*" class="hidden" disabled={authStore.isRestricted} />
    </div>

    <!-- User Info -->
    <div class="flex flex-col gap-5">
      <!-- Display Name -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"> Display Name </span>
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
                <span class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
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
            <div class="flex items-center gap-2">
              <span id="display-name-value" class="text-sm text-slate-900 dark:text-slate-100 wrap-break-word"
                >{authStore.user?.name || "Not set"}</span
              >
              {#if authStore.user?.plan === "pro"}
                <span
                  class="px-1.5 py-0.5 bg-indigo-600 text-[10px] font-black text-white rounded uppercase tracking-tighter shadow-sm shadow-indigo-500/20"
                >
                  Pro
                </span>
              {/if}
            </div>
            <button
              class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-600/10 transition-all active:scale-90"
              onclick={startEditName}
              aria-label="Edit display name"
            >
              <Icon name="edit" class="w-3.5 h-3.5" />
            </button>
          </div>
        {/if}
      </div>

      <!-- Bio -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"> Bio </span>
        {#if editingBio}
          <div class="flex flex-col gap-2">
            <textarea
              id="bio-input"
              bind:value={bioInput}
              placeholder="Tell us something about yourself..."
              maxlength="200"
              rows="3"
              class="input-field py-2! px-3! text-sm! resize-none"
            ></textarea>
            <div class="flex justify-between items-center">
              <span class="text-[10px] text-slate-400">
                {bioInput.length}/200
              </span>
              <div class="flex gap-2">
                <button
                  class="h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center text-xs font-bold transition-all disabled:opacity-40 active:scale-90"
                  onclick={handleSaveBio}
                  disabled={saving}
                >
                  {#if saving}
                    <span class="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"
                    ></span>
                  {:else}
                    Save
                  {/if}
                </button>
                <button
                  class="h-8 px-3 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center text-xs font-bold transition-all active:scale-90"
                  onclick={cancelEditBio}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div class="flex items-start justify-between gap-2">
            <p
              id="bio-value"
              class={[
                "text-sm leading-relaxed wrap-break-word flex-1",
                authStore.user?.bio ? "text-slate-600 dark:text-slate-400" : "text-slate-400 italic",
              ]}
            >
              {authStore.user?.bio || "No bio yet"}
            </p>
            <button
              class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-600/10 transition-all active:scale-90 shrink-0"
              onclick={startEditBio}
              aria-label="Edit bio"
            >
              <Icon name="edit" class="w-3.5 h-3.5" />
            </button>
          </div>
        {/if}
      </div>

      <!-- Username (read-only) -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</span>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span id="username-display" class="font-mono text-xs text-indigo-600 dark:text-indigo-400"
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
          <span class="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Read-only</span>
        </div>
      </div>

      <!-- Email (read-only) -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</span>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span id="email-display" class="text-sm text-slate-900 dark:text-slate-100">{authStore.user?.email}</span>
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

      <!-- Subscription Plan -->
      <div class="flex flex-col gap-1.5 pt-4 border-t border-slate-100 dark:border-white/5">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subscription Plan</span>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              class={[
                "text-sm font-medium",
                authStore.user?.plan === "pro"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400",
              ]}
            >
              {authStore.user?.plan === "pro" ? "Pro" : "Free"}
            </span>
            {#if authStore.user?.plan === "pro"}
              <Icon name="star" class="w-4 h-4 text-indigo-600" />
            {/if}
          </div>
          {#if authStore.user?.plan === "free"}
            <button
              type="button"
              onclick={() => routerStore.navigate(Route.PRICING)}
              class="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-600/10 hover:bg-indigo-600/20 px-3 py-1.5 rounded-full transition-all active:scale-95 no-underline"
            >
              Upgrade to Pro
            </button>
          {/if}
        </div>
      </div>
    </div>

    {#if saveError}
      <div class="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">
        {saveError}
      </div>
    {/if}
    {#if saveSuccess}
      <div class="text-xs text-emerald-500 bg-emerald-500/10 p-2 rounded-lg animate-in fade-in duration-300">
        Profile updated successfully!
      </div>
    {/if}
  </div>
</div>
