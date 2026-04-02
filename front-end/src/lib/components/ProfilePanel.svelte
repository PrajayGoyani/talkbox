<script lang="ts">
  import { authStore } from '../state/auth.svelte';
  import { API_BASE } from '../config';

  let editingName = $state(false);
  let nameInput = $state(authStore.user?.name || '');
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let saveSuccess = $state(false);

  // Avatar upload
  let avatarInput: HTMLInputElement | undefined = $state();
  let avatarPreview = $state<string | null>(null);
  let uploadingAvatar = $state(false);

  const displayName = $derived(authStore.user?.name || authStore.user?.username || '');

  /** Frontend sanitize: letters, spaces, hyphens, apostrophes only. Capitalize words. */
  function sanitizeName(val: string): string {
    return val
      .trim()
      .replace(/[^a-zA-Z\s\-']/g, '')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  const handleSaveName = async () => {
    saveError = null;
    saveSuccess = false;
    const sanitized = nameInput.trim() ? sanitizeName(nameInput) : undefined;

    if (sanitized && (sanitized.length < 2 || sanitized.length > 50)) {
      saveError = 'Name must be 2-50 characters';
      return;
    }

    saving = true;
    try {
      const resp = await fetch(`${API_BASE}/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify({ name: sanitized || null })
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error?.message || 'Failed to update name');

      // Update local auth state
      if (authStore.user) {
        authStore.user = { ...authStore.user, name: sanitized || undefined };
        localStorage.setItem('auth_user', JSON.stringify(authStore.user));
      }
      saveSuccess = true;
      editingName = false;
      setTimeout(() => saveSuccess = false, 3000);
    } catch (e) {
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
    if (!file.type.startsWith('image/')) {
      saveError = 'Please select an image file';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      saveError = 'Image must be under 5MB';
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
      const formData = new FormData();
      formData.append('avatar', file);
      const resp = await fetch(`${API_BASE}/user/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include',
        body: formData
      });
      if (!resp.ok) throw new Error('Failed to upload avatar');
      const result = await resp.json();
      if (authStore.user) {
        authStore.user = { ...authStore.user, avatarUrl: result.data?.avatar_url };
        localStorage.setItem('auth_user', JSON.stringify(authStore.user));
      }
    } catch (e) {
      saveError = (e as Error).message;
      avatarPreview = null;
    } finally {
      uploadingAvatar = false;
    }
  };

  const startEditName = () => {
    nameInput = authStore.user?.name || '';
    editingName = true;
    saveError = null;
  };

  const cancelEditName = () => {
    editingName = false;
    nameInput = authStore.user?.name || '';
    saveError = null;
  };
</script>

<div class="profile-panel">
  <div class="panel-header">
    <h2>Profile</h2>
  </div>

  <div class="profile-content">
    <!-- Avatar Section -->
    <div class="avatar-section">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="profile-avatar" onclick={handleAvatarSelect}>
        {#if avatarPreview || authStore.user?.avatarUrl}
          <img src={avatarPreview || authStore.user?.avatarUrl} alt="Avatar" />
        {:else}
          <span class="avatar-letter">{displayName[0]?.toUpperCase() || '?'}</span>
        {/if}
        <div class="avatar-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        {#if uploadingAvatar}
          <div class="avatar-loading">
            <span class="loader tiny"></span>
          </div>
        {/if}
      </div>
      <input 
        type="file" 
        bind:this={avatarInput} 
        onchange={handleAvatarChange}
        accept="image/*"
        class="hidden-input"
      />
    </div>

    <!-- User Info -->
    <div class="info-section">
      <!-- Display Name -->
      <div class="info-field">
        <label>Display Name</label>
        {#if editingName}
          <div class="edit-row">
            <input
              type="text"
              bind:value={nameInput}
              placeholder="Enter your display name"
              maxlength="50"
              class="field-input"
            />
            <button class="save-btn" onclick={handleSaveName} disabled={saving}>
              {#if saving}
                <span class="loader tiny"></span>
              {:else}
                ✓
              {/if}
            </button>
            <button class="cancel-btn" onclick={cancelEditName}>✕</button>
          </div>
        {:else}
          <div class="value-row">
            <span class="field-value">{authStore.user?.name || 'Not set'}</span>
            <button class="edit-btn" onclick={startEditName}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        {/if}
      </div>

      <!-- Username (read-only) -->
      <div class="info-field">
        <label>Username</label>
        <div class="value-row">
          <span class="field-value monospace">@{authStore.user?.username}</span>
          <span class="readonly-tag">Read-only</span>
        </div>
      </div>

      <!-- Email (read-only) -->
      <div class="info-field">
        <label>Email</label>
        <div class="value-row">
          <span class="field-value">{authStore.user?.email}</span>
        </div>
      </div>
    </div>

    {#if saveError}
      <div class="save-error">{saveError}</div>
    {/if}
    {#if saveSuccess}
      <div class="save-success">Profile updated successfully!</div>
    {/if}
  </div>
</div>

<style>
  .profile-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    padding: 1.25rem 1.25rem;
    border-bottom: 1px solid var(--glass-border);
  }

  .panel-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .profile-content {
    padding: 1.5rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
  }

  .avatar-section {
    display: flex;
    justify-content: center;
  }

  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
    transition: transform var(--transition-fast);
  }

  .profile-avatar:hover {
    transform: scale(1.05);
  }

  .profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-letter {
    font-size: 2rem;
    font-weight: 700;
    color: white;
  }

  .avatar-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .profile-avatar:hover .avatar-overlay {
    opacity: 1;
  }

  .avatar-loading {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hidden-input {
    display: none;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .info-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .info-field label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .value-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .field-value {
    font-size: 0.9rem;
    color: var(--text-primary);
    word-break: break-word;
  }

  .field-value.monospace {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.85rem;
    color: var(--color-primary);
  }

  .readonly-tag {
    font-size: 0.65rem;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    white-space: nowrap;
  }

  .edit-row {
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }

  .field-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.85rem;
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .field-input:focus {
    border-color: var(--color-primary);
  }

  .edit-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.3rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: all var(--transition-fast);
  }

  .edit-btn:hover {
    color: var(--color-primary);
    background: var(--color-primary-light);
  }

  .save-btn, .cancel-btn {
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all var(--transition-fast);
  }

  .save-btn {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }

  .save-btn:hover { background: rgba(74, 222, 128, 0.25); }
  .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .cancel-btn {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }

  .cancel-btn:hover { background: rgba(248, 113, 113, 0.25); }

  .save-error {
    font-size: 0.8rem;
    color: #f87171;
    padding: 0.5rem 0.75rem;
    background: rgba(248, 113, 113, 0.1);
    border-radius: 8px;
  }

  .save-success {
    font-size: 0.8rem;
    color: #4ade80;
    padding: 0.5rem 0.75rem;
    background: rgba(74, 222, 128, 0.1);
    border-radius: 8px;
    animation: fadeIn 0.3s ease-out;
  }

  .loader.tiny {
    width: 14px;
    height: 14px;
    border: 2px solid var(--glass-border);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s linear infinite;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
