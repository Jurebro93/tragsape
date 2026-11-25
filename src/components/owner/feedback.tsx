import type { ActionState } from "./types";

/** Poruka ispod obrasca: greška ili potvrda da je spremljeno. */
export function Feedback({ state, done }: { state: ActionState; done?: string }) {
  if (state.error) {
    return (
      <p className="text-sm font-medium text-danger" role="alert">
        {state.error}
      </p>
    );
  }
  const message = state.message ?? done;
  return state.done && message ? (
    <p className="text-sm font-medium text-teal" role="status">
      {message}
    </p>
  ) : null;
}
