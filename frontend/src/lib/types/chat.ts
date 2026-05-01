import type { ChatDto, MessageAlertDto } from "@root/shared/types/chat.dto";

export type ChatStatus = ChatDto["status"];

/**
 * UI-extended version of ChatDto with local state.
 */
export interface Chat extends ChatDto {
  isPinned?: boolean;
  /** Internal field for efficient sorting — not from API */
  _lastUpdateTs?: number;
}

export type { MessageAlertDto };
