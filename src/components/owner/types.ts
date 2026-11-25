/** Stanje koje poslužiteljske akcije vlasnikova prostora vraćaju obrascima. */
export type ActionState = {
  error: string | null;
  done?: boolean;
  /** Poruka o uspjehu, kad akcija ima što reći (npr. kamo je pozivnica poslana). */
  message?: string;
};

export type FormAction<State = ActionState> = (state: State, formData: FormData) => Promise<State>;

export const idleState: ActionState = { error: null };
