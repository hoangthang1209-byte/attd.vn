export type ClipboardWriter = {
  writeText: (text: string) => Promise<void>;
};

export async function copyQuoteNumber(
  quoteNumber: string,
  clipboard: ClipboardWriter | undefined =
    typeof navigator === "undefined" ? undefined : navigator.clipboard,
): Promise<boolean> {
  if (!clipboard) return false;

  try {
    await clipboard.writeText(quoteNumber);
    return true;
  } catch {
    return false;
  }
}
