import { startTransition, type FormEvent } from "react";

/**
 * `onSubmit` za obrasce s `useActionState`: akciju šalje ručno, unutar prijelaza.
 *
 * React nakon akcije poslane kroz `action` obrasca vraća sva polja na početne vrijednosti, pa bi
 * posjetitelj nakon greške u provjeri izgubio sve što je upisao. Ovako upisano ostaje. `action`
 * na obrascu treba ostati postavljen, da obrazac radi i prije nego što se stranica hidrira.
 */
export function keepValues(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Gumb kojim je obrazac poslan nosi svoje ime i vrijednost; bez njega bi se izgubili.
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
}
