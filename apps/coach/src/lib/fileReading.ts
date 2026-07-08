import type { ChatAttachment } from "./anthropic";

export interface PendingAttachment extends ChatAttachment {
  id: string;
}

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function readFileAsAttachment(
  file: File
): Promise<{ attachment: PendingAttachment; error?: undefined } | { attachment?: undefined; error: string }> {
  const id = crypto.randomUUID();

  if (ACCEPTED_IMAGE_TYPES.has(file.type)) {
    const data = await readAsBase64(file);
    return { attachment: { id, name: file.name, kind: "image", mimeType: file.type, data } };
  }

  if (file.type === "application/pdf") {
    const data = await readAsBase64(file);
    return { attachment: { id, name: file.name, kind: "pdf", mimeType: file.type, data } };
  }

  if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    const data = await readAsText(file);
    return { attachment: { id, name: file.name, kind: "text", mimeType: "text/plain", data } };
  }

  return { error: `${file.name}: only images, PDFs, and text files are supported right now.` };
}
