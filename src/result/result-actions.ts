import type { ButtonProps } from "@/components/ui/button";

export function getResultActionModes(hasCopiedToNotion: boolean): {
  copyButtonVariant: ButtonProps["variant"];
  newStartButtonVariant: ButtonProps["variant"];
} {
  return {
    copyButtonVariant: hasCopiedToNotion ? "secondary" : "default",
    newStartButtonVariant: hasCopiedToNotion ? "default" : "secondary",
  };
}
