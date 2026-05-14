export interface IPolicyService {
  isSessionLimitReached(plan: string, globalCount: number): boolean;
  getProSessionLimit(): number;
}
