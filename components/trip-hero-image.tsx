"use client";

import { useState } from "react";

export function TripHeroImage({
  src,
  alt,
  heightClass = "h-28",
}: {
  src?: string | null;
  alt: string;
  heightClass?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(src) && !errored;

  // Rounds its own top corners: the card wrapper can't use overflow-hidden to clip
  // them, because that silently disables position:sticky on the day strip inside it.
  const shape = "sm:rounded-t-[24px]";

  if (!showImage) {
    return (
      <div
        className={`${heightClass} ${shape} w-full bg-gradient-to-br from-rs-primary/20 to-rs-surface`}
      />
    );
  }

  return (
    <img
      src={src ?? ""}
      alt={alt}
      onError={() => setErrored(true)}
      className={`${heightClass} ${shape} w-full object-cover`}
    />
  );
}
