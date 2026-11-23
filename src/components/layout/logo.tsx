import Image from "next/image";
import { cn } from "@/lib/utils";

const sources = {
  dark: "/brand/essenza-logo-dark.png",
  light: "/brand/essenza-logo-light.png",
} as const;

// Original artwork is 2172x724 (~3:1).
export function Logo({
  variant = "dark",
  className,
  width = 160,
}: {
  variant?: keyof typeof sources;
  className?: string;
  width?: number;
}) {
  return (
    <Image
      src={sources[variant]}
      alt="Essenza Perfumaria & Cosméticos"
      width={width}
      height={Math.round((width * 724) / 2172)}
      className={cn("h-auto w-auto", className)}
      priority
    />
  );
}
