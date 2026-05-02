import type {
  MessageAckDto,
  MessageAlertDto,
  MessageDto,
  MessageReactionUpdateDto,
  ProfileUpdateDto,
  TypingIndicatorDto,
  UserStatusDto,
} from "shared/types/chat.dto";
import type { NotificationDto } from "shared/types/notification.dto";

export interface ServerToClientEvents {
  session_error: (payload: { reason: string; message: string }) => void;
  error: (payload: { message: string; code?: string }) => void;
  user_status: (payload: UserStatusDto) => void;
  user_status_batch: (payload: UserStatusDto[]) => void;
  typing_start: (payload: TypingIndicatorDto) => void;
  typing_stop: (payload: TypingIndicatorDto) => void;
  message_reaction_update: (payload: MessageReactionUpdateDto) => void;
  receive_message: (payload: MessageDto) => void;
  message_alert: (payload: MessageAlertDto) => void;
  message_deleted: (payload: { messageId: string; chatId: string; isLastMessage: boolean }) => void;
  message_updated: (payload: {
    messageId: string;
    chatId: string;
    contentBody: string;
    isEdited: boolean;
    editedAt: string | Date;
  }) => void;
  notification: (payload: NotificationDto) => void;
  chat_accepted: (payload: { chatId: string }) => void;
  profile_updated: (payload: ProfileUpdateDto) => void;
}

export interface ClientToServerEvents {
  send_message: (
    data: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
    callback?: (res: MessageAckDto) => void,
  ) => void;
  react_message: (data: { messageId: string; emoji: string; slug?: string }) => void;
  delete_message: (data: { messageId: string }) => void;
  edit_message: (data: { messageId: string; contentBody: string }) => void;
  store_public_bundle: (
    bundleData: any,
    callback?: (res: { status: "ok" | "error" }) => void,
  ) => void;
  typing_start: (data: { receiverId: string; chatId: string }) => void;
  typing_stop: (data: { receiverId: string; chatId: string }) => void;
}
