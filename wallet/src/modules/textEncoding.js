/**
 * React Native–safe UTF-8 encoder/decoder.
 *
 * Avoids relying on global TextEncoder/TextDecoder (not always present in RN/JSC).
 * Does not use Node-only APIs.
 */

/**
 * Encode a JS string to UTF-8 bytes.
 * @param {string} input
 * @returns {Uint8Array}
 */
export const encodeUtf8 = (input) => {
  const bytes = [];
  for (let i = 0; i < input.length; i++) {
    let codePoint = input.charCodeAt(i);

    // Handle surrogate pairs for code points > 0xFFFF
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = ((codePoint - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    }
  }
  return new Uint8Array(bytes);
};

/**
 * Decode UTF-8 bytes to a JS string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const decodeUtf8 = (bytes) => {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i++];

    if ((b0 & 0x80) === 0) {
      out += String.fromCharCode(b0);
      continue;
    }

    if ((b0 & 0xe0) === 0xc0) {
      const b1 = bytes[i++];
      const codePoint = ((b0 & 0x1f) << 6) | (b1 & 0x3f);
      out += String.fromCharCode(codePoint);
      continue;
    }

    if ((b0 & 0xf0) === 0xe0) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      const codePoint = ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f);
      out += String.fromCharCode(codePoint);
      continue;
    }

    // 4-byte sequence
    const b1 = bytes[i++];
    const b2 = bytes[i++];
    const b3 = bytes[i++];
    let codePoint =
      ((b0 & 0x07) << 18) |
      ((b1 & 0x3f) << 12) |
      ((b2 & 0x3f) << 6) |
      (b3 & 0x3f);
    codePoint -= 0x10000;
    out += String.fromCharCode(0xd800 | (codePoint >> 10));
    out += String.fromCharCode(0xdc00 | (codePoint & 0x3ff));
  }
  return out;
};
