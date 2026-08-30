import { useCallback, useRef, useState } from "react";

interface JoystickProps {
  onChange: (v: { x: number; y: number }) => void;
}

const RADIUS = 46;

/** Dokunmatik yürüyüş kolu (mouse ile de çalışır) */
export function Joystick({ onChange }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const el = baseRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let dx = clientX - (r.left + r.width / 2);
      let dy = clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        dx = (dx / len) * RADIUS;
        dy = (dy / len) * RADIUS;
      }
      setKnob({ x: dx, y: dy });
      onChange({ x: dx / RADIUS, y: dy / RADIUS });
    },
    [onChange],
  );

  const reset = useCallback(() => {
    setKnob({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  }, [onChange]);

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e.clientX, e.clientY);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      className="relative h-32 w-32 touch-none rounded-full border border-border/50 bg-card/60 shadow-lg backdrop-blur-md"
      aria-label="Yürüyüş kolu"
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-primary/80 shadow-md"
        style={{ transform: `translate(-50%, -50%) translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
