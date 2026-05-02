import type { Component } from "svelte";

/**
 * Registry of lazy-loaded views and components.
 * Using functions that return import() ensures Vite can still perform static analysis for code-splitting.
 */
export const Views = {
  // Auth
  Login: () => import("$components/auth/Login.svelte"),
  Signup: () => import("$components/auth/Signup.svelte"),
  ForgotPassword: () => import("$components/auth/ForgotPassword.svelte"),
  ResetPassword: () => import("$components/auth/ResetPassword.svelte"),
  VerifyEmail: () => import("$components/auth/VerifyEmail.svelte"),

  // Chat
  ChatWindow: () => import("$components/chat/ChatWindow.svelte"),
  ConversationsPanel: () => import("$components/chat/ConversationsPanel.svelte"),
  ChatPartnerProfile: () => import("$components/chat/ChatPartnerProfile.svelte"),
  ReactionTooltip: () => import("$components/chat/ReactionTooltip.svelte"),

  // Panels
  ProfilePanel: () => import("$components/panels/ProfilePanel.svelte"),
  RequestsPanel: () => import("$components/panels/RequestsPanel.svelte"),
  SettingsPanel: () => import("$components/panels/SettingsPanel.svelte"),

  // Views / Documentation
  Home: () => import("$components/views/Home.svelte"),
  Privacy: () => import("$components/views/Privacy.svelte"),
  Terms: () => import("$components/views/Terms.svelte"),
  Pricing: () => import("$components/views/Pricing.svelte"),
  FAQ: () => import("$components/views/FAQ.svelte"),

  // Global
  GlobalTooltip: () => import("$components/ui/GlobalTooltip.svelte"),
  ConfirmationDialog: () => import("$components/ui/ConfirmationDialog.svelte"),
} as const;

export type ViewName = keyof typeof Views;
export type Importer<T extends Component<any, any>> = () => Promise<{ default: T }>;
