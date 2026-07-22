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

  if (!showImage) {
    return <div className={`${heightClass} w-full bg-gradient-to-br from-rs-primary/20 to-rs-surface`} />;
  }

  return (
    <img
      src={src ?? ""}
      alt={alt}
      onError={() => setErrored(true)}
      className={`${heightClass} w-full object-cover`}
    />
  );
}
