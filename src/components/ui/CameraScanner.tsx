import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

let counter = 0;

// Camera QR scanner that keeps html5-qrcode's DOM fully outside React's
// reconciliation. The library injects a <video>/<canvas> into its mount node;
// if that node lives in React's tree, teardown races React and throws
// "Failed to execute 'removeChild' on 'Node'". So we create the mount node
// imperatively, hand it to the library, and remove it ourselves on cleanup.
export function CameraScanner({
  onDecode,
  onError,
  className,
}: {
  onDecode: (text: string) => void;
  onError?: () => void;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onDecodeRef = useRef(onDecode);
  const onErrorRef = useRef(onError);
  onDecodeRef.current = onDecode;
  onErrorRef.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const mount = document.createElement('div');
    mount.id = `pb-qr-${++counter}`;
    host.appendChild(mount);

    let active = true;
    let scanner: Html5Qrcode | null = null;
    try {
      scanner = new Html5Qrcode(mount.id);
      scanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            // size the scan box off the live viewfinder — a fixed box larger
            // than the camera element throws on narrow phone screens
            qrbox: (w, h) => {
              const s = Math.max(140, Math.floor(Math.min(w, h) * 0.72));
              return { width: s, height: s };
            },
          },
          (text) => {
            if (!active) return;
            active = false;
            onDecodeRef.current(text);
          },
          () => {},
        )
        .catch(() => onErrorRef.current?.());
    } catch {
      onErrorRef.current?.();
    }

    return () => {
      active = false;
      const detach = () => {
        try {
          scanner?.clear();
        } catch {
          /* noop */
        }
        try {
          host.removeChild(mount);
        } catch {
          /* noop */
        }
      };
      // stop the camera, then remove the library's node ourselves
      if (scanner) scanner.stop().then(detach).catch(detach);
      else detach();
    };
  }, []);

  return <div ref={hostRef} className={className} />;
}
