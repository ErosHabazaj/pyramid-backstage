import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a scannable QR code for a value (cart tag). */
export function QrThumb({ value, size = 56 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 3 })
      .then((url) => alive && setSrc(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value, size]);

  return src ? (
    <img
      src={src}
      width={size}
      height={size}
      alt={`QR code ${value}`}
      className="shrink-0 rounded bg-white"
    />
  ) : (
    <div className="shrink-0 rounded bg-surface-2" style={{ width: size, height: size }} />
  );
}
