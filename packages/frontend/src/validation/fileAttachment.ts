export interface FileAttachmentRules {
  maxBytes: number;
  allowedExtensionPattern?: RegExp;
  allowedImageTypes?: boolean;
  maxBytesMessage?: (fileName: string, maxBytes: number) => string;
  typeMessage?: (fileName: string) => string;
}

const defaultRules: FileAttachmentRules = {
  maxBytes: 5 * 1024 * 1024,
  allowedExtensionPattern: /\.(jpe?g|png|gif|webp|pdf|csv|txt|xlsx?|docx?)$/i,
  allowedImageTypes: true,
};

/** Validate a browser File for upload. Returns an error message or null. */
export function validateFileAttachment(file: File | null | undefined, rules: Partial<FileAttachmentRules> = {}): string | null {
  const config = { ...defaultRules, ...rules };
  if (!file) return "Invalid file.";

  if (file.size > config.maxBytes) {
    return config.maxBytesMessage?.(file.name, config.maxBytes)
      ?? `"${file.name}" is too large. Each file must be ${Math.round(config.maxBytes / (1024 * 1024))} MB or smaller.`;
  }

  const isImage = config.allowedImageTypes && file.type.startsWith("image/");
  if (!isImage && config.allowedExtensionPattern && !config.allowedExtensionPattern.test(file.name)) {
    return config.typeMessage?.(file.name)
      ?? `"${file.name}" is not a supported type. Use images, PDF, CSV, or common documents.`;
  }

  return null;
}

/** Return true when a file looks like an image attachment. */
export function isImageAttachment(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

export const DEFAULT_MAX_ATTACHMENTS = 5;
export const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;
