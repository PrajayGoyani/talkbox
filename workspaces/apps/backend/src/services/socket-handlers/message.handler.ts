import { messageService } from "@services/chat/message.service";
import { MessageDto } from "shared/types/chat.dto";

import { AuthenticatedSocketUser, TypedIO } from "@/types/socket.types";

export class MessageHandler {
  constructor(private ioProvider: () => TypedIO | null) {}

  async saveAndDeliver(
    sender: AuthenticatedSocketUser,
    payload: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
  ): Promise<MessageDto> {
    return messageService.saveAndDeliver(sender, payload);
  }

  async handleDelete(sender: AuthenticatedSocketUser, messageId: string) {
    return messageService.deleteMessage(sender, messageId);
  }

  async handleEdit(sender: AuthenticatedSocketUser, messageId: string, contentBody: string) {
    return messageService.editMessage(sender, messageId, contentBody);
  }
}
