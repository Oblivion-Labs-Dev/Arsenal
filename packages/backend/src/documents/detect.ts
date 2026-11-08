// File-type detection by content, not name. Ported from Kaka packages/documents/src/detect.ts.
export type FileFormat = 'pdf' | 'docx' | 'doc' | 'txt';

export type Detection = { ok: true; format: FileFormat } | { ok: false; reason: string };

const EXTENSIONS: Record<string, FileFormat> = {
  pdf: 'pdf',
  docx: 'docx',
  doc: 'doc',
  txt: 'txt',
  md: 'txt',
};

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/**
 * Decides what a file really is from its bytes, and refuses it unless the
 * bytes agree with its name. A renamed executable, a macro-enabled Word file
 * or a binary posing as .txt never reaches a parser.
 *
 * Reasons are shown to the user, so they say what to do, not what failed.
 */
export function detectFormat(bytes: Uint8Array, filename: string): Detection {
  const extension = filename.toLowerCase().split('.').pop() ?? '';
  if (extension === 'docm' || extension === 'dotm') {
    return refuse(
      'Macro-enabled Word files are not accepted. Save it as a regular .docx and try again.',
    );
  }
  const claimed = EXTENSIONS[extension];
  if (!claimed) {
    return refuse('Only PDF, Word (.docx, .doc) and plain-text files are accepted.');
  }
  if (bytes.length === 0) return refuse('That file is empty.');

  const actual = sniff(bytes);
  if (actual === 'docx-macro') {
    return refuse(
      'This Word file contains macros. Save it as a regular .docx without macros and try again.',
    );
  }
  if (actual !== claimed) {
    return refuse(
      `This file is named .${extension} but its contents are not a ${label(claimed)} file.`,
    );
  }
  if (actual === 'docx' && !withinZipLimits(bytes)) {
    return refuse(
      'This Word file expands to far more than a document needs. Save it again as a regular .docx (without embedded media) and try again.',
    );
  }
  return { ok: true, format: actual };
}

/** A Word document never needs more than this once unpacked; a "zip bomb" needs far more. */
const MAX_INFLATED_BYTES = 100 * 1024 * 1024;
/** Real documents compress text maybe 10:1; hundreds to one is a constructed file. */
const MAX_RATIO = 200;

/**
 * Reads the zip's central directory, which lists each entry's packed and
 * unpacked size, without inflating anything. Parsing happens in a worker whose
 * memory limit doesn't cover inflated buffers, so oversized files are refused here.
 */
export function withinZipLimits(bytes: Uint8Array): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end-of-central-directory record sits in the last 64 KiB (after an optional comment).
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end === -1) return false;
  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  // Zip64 (sizes over 4 GiB) is never needed for a document.
  if (entries === 0xffff || at === 0xffffffff) return false;
  let total = 0;
  for (let n = 0; n < entries; n++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) return false;
    const packed = view.getUint32(at + 20, true);
    const unpacked = view.getUint32(at + 24, true);
    if (packed === 0xffffffff || unpacked === 0xffffffff) return false;
    total += unpacked;
    if (total > MAX_INFLATED_BYTES) return false;
    if (unpacked > 1024 * 1024 && unpacked / Math.max(1, packed) > MAX_RATIO) return false;
    at +=
      46 +
      view.getUint16(at + 28, true) +
      view.getUint16(at + 30, true) +
      view.getUint16(at + 32, true);
  }
  return true;
}

function sniff(bytes: Uint8Array): FileFormat | 'docx-macro' | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf'; // %PDF-
  if (startsWith(bytes, OLE_SIGNATURE)) return 'doc';
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // Zip entry names are stored as plain bytes, so a scan finds them without unzipping.
    const names = new TextDecoder('latin1').decode(bytes);
    if (names.includes('vbaProject.bin')) return 'docx-macro';
    return names.includes('word/document.xml') ? 'docx' : null;
  }
  return isPlainText(bytes) ? 'txt' : null;
}

function isPlainText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function label(format: FileFormat): string {
  return { pdf: 'PDF', docx: 'Word (.docx)', doc: 'Word (.doc)', txt: 'plain-text' }[format];
}

function refuse(reason: string): Detection {
  return { ok: false, reason };
}
