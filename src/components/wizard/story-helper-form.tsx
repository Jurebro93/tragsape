"use client";

import { useActionState } from "react";
import { draftStoryAction, saveDraftAsStoryAction, type HelperState } from "@/app/izradi/[id]/pomocnik/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { storyHelper } from "@/messages/hr/story-helper";

/** Osam pitanja i, nakon odgovora, nacrt priče u polju koje vlasnik slobodno mijenja. */
export function StoryHelperForm({ memorialId, hasStory }: { memorialId: string; hasStory: boolean }) {
  const initial: HelperState = { draft: null, error: null, answers: {} };
  const [state, action, pending] = useActionState(draftStoryAction.bind(null, memorialId), initial);
  return (
    <div className="flex flex-col gap-5">
      {state.draft ? (
        <Card className="flex flex-col gap-4 bg-mint">
          <form action={saveDraftAsStoryAction.bind(null, memorialId)} className="flex flex-col gap-4">
            <Field label={storyHelper.draftTitle} htmlFor="story-draft" hint={storyHelper.draftHint}>
              <Textarea
                id="story-draft"
                name="story"
                key={state.draft}
                defaultValue={state.draft}
                maxLength={20000}
                className="min-h-80"
              />
            </Field>
            {hasStory ? <p className="text-sm text-plum-soft">{storyHelper.replaceNote}</p> : null}
            <Button type="submit">{storyHelper.save}</Button>
          </form>
        </Card>
      ) : null}

      <form action={action} className="flex flex-col gap-5">
        <Card className="flex flex-col gap-5">
          {storyHelper.questions.map((question) => (
            <Field
              key={question.key}
              label={question.label}
              htmlFor={`q-${question.key}`}
              optional
              hint={question.hint || undefined}
            >
              <Textarea
                id={`q-${question.key}`}
                name={question.key}
                maxLength={600}
                className="min-h-24"
                defaultValue={state.answers[question.key] ?? ""}
              />
            </Field>
          ))}
        </Card>
        <p className="text-sm text-plum-soft">{storyHelper.privacy}</p>
        {state.error ? (
          <p className="rounded-2xl bg-butter px-4 py-3 font-medium" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" variant={state.draft ? "secondary" : "primary"} disabled={pending}>
          {pending ? storyHelper.submitting : state.draft ? storyHelper.again : storyHelper.submit}
        </Button>
      </form>
    </div>
  );
}
