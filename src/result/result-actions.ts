import type { ButtonProps } from "@/components/ui/button";

export type SourcePanelLayoutMode = "bottom-sheet" | "side-panel";

export function getResultActionModes(hasCopiedToNotion: boolean): {
  copyButtonVariant: ButtonProps["variant"];
  newStartButtonVariant: ButtonProps["variant"];
} {
  return {
    copyButtonVariant: hasCopiedToNotion ? "secondary" : "default",
    newStartButtonVariant: hasCopiedToNotion ? "default" : "secondary",
  };
}

export function getSourcePanelLayoutMode(viewportWidth: number): SourcePanelLayoutMode {
  return viewportWidth >= 1024 ? "side-panel" : "bottom-sheet";
}
