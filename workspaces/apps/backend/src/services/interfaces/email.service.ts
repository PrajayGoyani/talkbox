export interface IEmailService {
  isConfigured: boolean;
  sendResetEmail(to: string, token: string): Promise<void>;
  sendVerificationEmail(to: string, token: string): Promise<void>;
}
