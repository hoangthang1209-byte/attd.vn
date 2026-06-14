export async function uploadBlogImage(file: File): Promise<{ url: string; altText: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "blog");

  const res = await fetch("/api/media", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "Upload thất bại");
  }

  const altText =
    (typeof data.altText === "string" && data.altText.trim()) ||
    file.name.replace(/\.[^.]+$/, "");

  return { url: data.url as string, altText };
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}
