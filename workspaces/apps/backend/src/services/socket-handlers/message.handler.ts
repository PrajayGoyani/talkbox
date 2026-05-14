import { IMessageService } from "@services/chat/types";
import { MessageDto } from "shared/types/chat.dto";

import { AuthenticatedSocketUser, TypedIO } from "@/types/socket.types";

export class MessageHandler {
  constructor(
    private ioProvider: () => TypedIO | null,
    private messageService: IMessageService,
  ) {}

  async saveAndDeliver(
    sender: AuthenticatedSocketUser,
    payload: { chatId: string; receiverId: string; contentBody: string; idempotencyKey: string },
  ): Promise<MessageDto> {
    return this.messageService.saveAndDeliver(sender, payload);
  }

  async handleDelete(sender: AuthenticatedSocketUser, messageId: string) {
    return this.messageService.deleteMessage(sender, messageId);
  }

  async handleEdit(sender: AuthenticatedSocketUser, messageId: string, contentBody: string) {
    return this.messageService.editMessage(sender, messageId, contentBody);
  }
}
