"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { goToReviewAction, saveStoryAction } from "@/app/izradi/actions";
import { PhotoUploader } from "@/components/wizard/photo-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { DEDICATION_MAX, type Photo } from "@/lib/memorial";
import { fill } from "@/lib/text";
import { storyHelper } from "@/messages/hr/story-helper";
import { wizard } from "@/messages/hr/wizard";

export type StoryInitial = {
  dedication: string;
  story: string;
  nicknames: string;
  traits: string;
  toy: string;
  treat: string;
  place: string;
  habits: string;
  video: string;
};

const text = wizard.story;

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Pretvara vrijednosti obrasca u oblik koji sprema baza. */
function toPatch(values: StoryInitial) {
  return {
    dedication: values.dedication,
    story_md: values.story,
    nicknames: toList(values.nicknames).slice(0, 8),
    traits: toList(values.traits).slice(0, 12),
    favorite_toy: values.toy,
    favorite_treat: values.treat,
    favorite_place: values.place,
    funny_habits: values.habits,
    video_url: values.video,
  };
}

/** Drugi korak. Svako polje se sprema kad ga korisnik napusti, pa se nacrt ne gubi. */
export function StoryForm({
  memorialId,
  initial,
  photos,
  coverPhotoId,
  photoLimit,
  isPaid,
  canSaveLater = false,
}: {
  memorialId: string;
  initial: StoryInitial;
  photos: Photo[];
  coverPhotoId: string | null;
  photoLimit: number;
  isPaid: boolean;
  /** Anonimnom vlasniku nudi se da nacrt veže uz e-mail prije nego što nastavi. */
  canSaveLater?: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [leaving, startLeaving] = useTransition();
  const saved = useRef(JSON.stringify(toPatch(initial)));

  function set<K extends keyof StoryInitial>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save(): Promise<boolean> {
    const patch = toPatch(values);
    const serialized = JSON.stringify(patch);
    if (serialized === saved.current) {
      return true;
    }
    setStatus("saving");
    const result = await saveStoryAction(memorialId, patch);
    if (result.ok) {
      saved.current = serialized;
      setStatus("saved");
      setError(null);
      return true;
    }
    setStatus("error");
    setError(result.error);
    return false;
  }

  function next() {
    startLeaving(async () => {
      if (await save()) {
        await goToReviewAction(memorialId);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5" onBlur={() => void save()}>
      <Card className="flex flex-col gap-4">
        <h2 className="text-2xl font-extrabold">{text.photos.title}</h2>
        <PhotoUploader
          memorialId={memorialId}
          initialPhotos={photos}
          initialCoverId={coverPhotoId}
          limit={photoLimit}
          isPaid={isPaid}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <Field
          label={text.dedication}
          htmlFor="dedication"
          optional
          hint={`${text.dedicationHint} ${fill(text.counter, { n: values.dedication.length, max: DEDICATION_MAX })}`}
        >
          <Textarea
            id="dedication"
            maxLength={DEDICATION_MAX}
            value={values.dedication}
            onChange={(event) => set("dedication", event.target.value)}
            placeholder={text.dedicationPlaceholder}
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-extrabold">{text.more.title}</h2>
          {isPaid ? null : <p className="text-sm text-plum-soft">{text.more.note}</p>}
        </div>
        <Field label={text.more.traits} htmlFor="traits" optional hint={text.more.listHint}>
          <Input
            id="traits"
            value={values.traits}
            onChange={(event) => set("traits", event.target.value)}
            placeholder={text.more.traitsPlaceholder}
          />
        </Field>
        <Field label={text.more.nicknames} htmlFor="nicknames" optional hint={text.more.listHint}>
          <Input
            id="nicknames"
            value={values.nicknames}
            onChange={(event) => set("nicknames", event.target.value)}
            placeholder={text.more.nicknamesPlaceholder}
          />
        </Field>
        <Field label={text.more.toy} htmlFor="toy" optional>
          <Input id="toy" maxLength={120} value={values.toy} onChange={(event) => set("toy", event.target.value)} />
        </Field>
        <Field label={text.more.treat} htmlFor="treat" optional>
          <Input
            id="treat"
            maxLength={120}
            value={values.treat}
            onChange={(event) => set("treat", event.target.value)}
          />
        </Field>
        <Field label={text.more.place} htmlFor="place" optional>
          <Input
            id="place"
            maxLength={120}
            value={values.place}
            onChange={(event) => set("place", event.target.value)}
          />
        </Field>
        <Field label={text.more.habits} htmlFor="habits" optional>
          <Textarea
            id="habits"
            maxLength={600}
            value={values.habits}
            onChange={(event) => set("habits", event.target.value)}
          />
        </Field>
        <Field label={text.more.story} htmlFor="story" optional hint={text.more.storyHint}>
          <Textarea
            id="story"
            maxLength={20000}
            className="min-h-56"
            value={values.story}
            onChange={(event) => set("story", event.target.value)}
          />
        </Field>
        {isPaid ? (
          <Link
            href={`/izradi/${memorialId}/pomocnik` as Route}
            className="-mt-2 min-h-11 content-center text-[15px] font-semibold"
          >
            {storyHelper.link}
          </Link>
        ) : (
          <p className="-mt-2 text-sm text-plum-soft">{storyHelper.paidNote}</p>
        )}
        <Field label={text.more.video} htmlFor="video" optional hint={text.more.videoHint}>
          <Input
            id="video"
            type="url"
            inputMode="url"
            maxLength={300}
            value={values.video}
            onChange={(event) => set("video", event.target.value)}
          />
        </Field>
      </Card>

      <p className="min-h-6 text-sm text-plum-soft" aria-live="polite">
        {status === "saving" ? text.saving : status === "saved" ? text.saved : null}
        {status === "error" ? <span className="font-medium text-danger">{error ?? text.saveError}</span> : null}
      </p>
      <Button onClick={next} disabled={leaving}>
        {leaving ? text.saving : text.next}
      </Button>
      {canSaveLater ? (
        <Link
          href={`/izradi/${memorialId}/spremi` as Route}
          className="min-h-11 content-center self-center text-[15px] font-semibold"
        >
          {wizard.saveLater}
        </Link>
      ) : null}
    </div>
  );
}
