import type { ChatDto, MessageAlertDto, MessageDto } from "@shared/types/chat.dto";

export type { ChatDto, MessageAlertDto, MessageDto };

export type ChatStatus = ChatDto["status"];

/**
 * UI-extended version of ChatDto with local state.
 */
export interface Chat extends ChatDto {
  isPinned?: boolean;
  /** Internal field for efficient sorting — not from API */
  _lastUpdateTs?: number;
}
