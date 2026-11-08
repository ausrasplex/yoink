"use client";

import { Download, QrCode } from "lucide-react";
import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

/** QR card for one item, with PNG/SVG downloads built in the browser from the rendered code. */
export function ItemQr({ url, lot, color, logo }: { url: string; lot: number; color: string; logo: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const svgText = () => {
    const svg = box.current?.querySelector("svg");
    if (!svg) return null;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1024"); clone.setAttribute("height", "1024");
    return new XMLSerializer().serializeToString(clone);
  };
  const save = (href: string, ext: string) => {
    const a = document.createElement("a");
    a.href = href; a.download = `lot-${lot}-qr.${ext}`; a.click();
  };
  const downloadSvg = () => {
    const t = svgText(); if (!t) return;
    const u = URL.createObjectURL(new Blob([t], { type: "image/svg+xml" }));
    save(u, "svg"); setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  const downloadPng = () => {
    const t = svgText(); if (!t) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 1024;
      const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1024, 1024); ctx.drawImage(img, 0, 0, 1024, 1024);
      save(c.toDataURL("image/png"), "png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t)}`;
  };

  return (
    <section id="qr" className="rounded-3xl bg-white p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink"><QrCode className="size-5" /> QR code</h2>
      <div ref={box} className="mx-auto mt-4 w-fit rounded-2xl border p-3" data-testid="item-qr">
        <QRCodeSVG value={url} size={200} marginSize={2} level={logo ? "H" : "M"} fgColor={color}
          imageSettings={logo ? { src: logo, height: 46, width: 46, excavate: true } : undefined} />
      </div>
      <p className="mt-3 break-all text-center text-xs text-muted-foreground">{url}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={downloadPng}><Download /> PNG</Button>
        <Button variant="outline" size="sm" onClick={downloadSvg}><Download /> SVG</Button>
      </div>
    </section>
  );
}
