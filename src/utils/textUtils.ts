export function isBinary(buffer: Buffer, maxBytes = 8192): boolean {
  if (buffer.length === 0) {
    return false;
  }

  const bytesToCheck = Math.min(buffer.length, maxBytes);
  let nullByteCount = 0;
  let controlCharCount = 0;

  for (let i = 0; i < bytesToCheck; i++) {
    const byte = buffer[i];

    if (byte === 0) {
      nullByteCount++;
      if (nullByteCount > 1) {
        return true;
      }
    }

    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13 && byte !== 27) {
      controlCharCount++;
      if (controlCharCount > bytesToCheck * 0.1) {
        return true;
      }
    }
  }

  let highBitCount = 0;
  for (let i = 0; i < bytesToCheck; i++) {
    if (buffer[i] > 127) {
      highBitCount++;
    }
  }

  return highBitCount > bytesToCheck * 0.3;
}