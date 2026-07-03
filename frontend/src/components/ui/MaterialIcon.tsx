import React from "react";

type Props = {
  name: string;
  className?: string;
};

/** Google Material Symbols (Outlined). Load font in `public/index.html`. */
export function MaterialIcon({ name, className = "" }: Props) {
  return <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>;
}
