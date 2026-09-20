import { useEffect, useRef, useState, type RefObject } from "react";
import type { Editor } from "grapesjs";
import { Maximize, Minus, Plus } from "lucide-react";
import { A4_WIDTH } from "./configs/grapesjs.config";
import { ToolButton } from "./designer-toolbar";
import styles from "./invoice-designer.module.css";

const clampZoom = (zoom: number) =>
  Math.max(20, Math.min(250, Math.round(zoom)));

export function InvoiceCanvas({
  canvasRef,
  editor,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  editor: Editor | null;
}) {
  const fitRef = useRef(true);
  const [actualZoom, setActualZoom] = useState(100);

  function fit() {
    if (!editor || !canvasRef.current) return;
    fitRef.current = true;
    const zoom = clampZoom(
      Math.min(100, ((canvasRef.current.clientWidth - 48) / A4_WIDTH) * 100),
    );
    editor.Canvas.fitViewport({ zoom, gap: 24, ignoreHeight: true });
    setActualZoom(zoom);
  }

  function setZoom(zoom: number) {
    if (!editor) return;
    fitRef.current = false;
    editor.Canvas.fitViewport({
      zoom: clampZoom(zoom),
      gap: 24,
      ignoreHeight: true,
    });
    setActualZoom(clampZoom(zoom));
  }

  useEffect(() => {
    const container = canvasRef.current;
    if (!editor || !container) return;
    const canvas = editor.Canvas;
    fitRef.current = true;
    const resize = () => {
      if (fitRef.current) {
        const zoom = clampZoom(
          Math.min(100, ((container.clientWidth - 48) / A4_WIDTH) * 100),
        );
        canvas.fitViewport({ zoom, gap: 24, ignoreHeight: true });
        setActualZoom(zoom);
      }
      editor.refresh();
    };
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      fitRef.current = false;
      const before = canvas.getZoom();
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? container.clientHeight
            : 1);
      const next = clampZoom(before * Math.exp(-delta * 0.002));
      const bounds = canvas.getElement().getBoundingClientRect();
      const frame = canvas.getFrameEl().getBoundingClientRect();
      const inFrame = event.currentTarget === canvas.getDocument();
      // Iframe pointer coordinates are in unscaled A4 pixels; anchor zoom at the cursor.
      const x =
        (inFrame
          ? frame.left + (event.clientX * before) / 100
          : event.clientX) -
        bounds.left -
        bounds.width / 2;
      const y =
        (inFrame ? frame.top + (event.clientY * before) / 100 : event.clientY) -
        bounds.top -
        bounds.height / 2;
      const coords = canvas.getCoords();
      canvas.setZoom(next);
      canvas.setCoords(
        x - ((x - coords.x) * next) / before,
        y - ((y - coords.y) * next) / before,
      );
      setActualZoom(next);
    };
    let frameDocument: Document | null = null;
    const bindFrame = () => {
      frameDocument?.removeEventListener("wheel", wheel, true);
      frameDocument = canvas.getDocument();
      frameDocument?.addEventListener("wheel", wheel, {
        capture: true,
        passive: false,
      });
      resize();
    };
    const versionLoaded = () => {
      fitRef.current = true;
      bindFrame();
    };
    const syncZoom = () => setActualZoom(Math.round(canvas.getZoom()));
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    container.addEventListener("wheel", wheel, {
      capture: true,
      passive: false,
    });
    editor.on("canvas:frame:load", bindFrame);
    editor.on("invoice:version-loaded", versionLoaded);
    editor.on("canvas:zoom", syncZoom);
    bindFrame();
    return () => {
      observer.disconnect();
      container.removeEventListener("wheel", wheel, true);
      frameDocument?.removeEventListener("wheel", wheel, true);
      editor.off("canvas:frame:load", bindFrame);
      editor.off("invoice:version-loaded", versionLoaded);
      editor.off("canvas:zoom", syncZoom);
    };
  }, [canvasRef, editor]);

  return (
    <section className={styles.canvasColumn} aria-label="Trang hóa đơn A4">
      <div
        ref={canvasRef}
        className={styles.canvas}
        data-testid="invoice-canvas"
      />
      <div className={styles.canvasToolbar}>
        <span>
          A4 <span className={styles.paperSize}>210 × 297 mm</span>
        </span>
        <div className={styles.zoomControls}>
          <ToolButton
            label="Thu nhỏ"
            onClick={() => setZoom(actualZoom - 10)}
            disabled={!editor || actualZoom <= 20}
          >
            <Minus size={16} />
          </ToolButton>
          <select
            aria-label="Thu phóng"
            value={actualZoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={!editor}
          >
            {Array.from(
              new Set([25, 50, 75, 100, 125, 150, 200, 250, actualZoom]),
            )
              .sort((a, b) => a - b)
              .map((value) => (
                <option key={value} value={value}>
                  {value}%
                </option>
              ))}
          </select>
          <ToolButton
            label="Phóng to"
            onClick={() => setZoom(actualZoom + 10)}
            disabled={!editor || actualZoom >= 250}
          >
            <Plus size={16} />
          </ToolButton>
          <span className={styles.separator} />
          <ToolButton label="Vừa chiều rộng" onClick={fit} disabled={!editor}>
            <Maximize size={16} />
          </ToolButton>
        </div>
      </div>
    </section>
  );
}
