// Checks for src/lib/svg.ts (SVG logo sanitising + repair). No database or browser needed:
//   npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import zlib from "node:zlib";
import { DOMParser } from "@xmldom/xmldom";
import { sanitizeSvg } from "../../src/lib/svg";

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const run = (s: string | Buffer) => sanitizeSvg(typeof s === "string" ? Buffer.from(s) : s);
const svg = (body: string, attrs = 'viewBox="0 0 10 10"') => `<svg ${NS} ${attrs}>${body}</svg>`;

/** Output must always be well-formed XML with an <svg> root in the SVG namespace. */
function wellFormed(out: string) {
  const doc = new DOMParser({ onError: (level, msg) => { if (level !== "warning") throw new Error(msg); } })
    .parseFromString(out, "image/svg+xml");
  assert.equal(doc.documentElement?.localName, "svg");
  assert.equal(doc.documentElement?.namespaceURI, "http://www.w3.org/2000/svg");
}
const clean = (input: string | Buffer) => { const out = run(input); wellFormed(out); return out; };
const lacks = (out: string, ...bad: RegExp[]) => bad.forEach((b) => assert.doesNotMatch(out, b));

// ---------------- security ----------------

test("removes <script>, including CDATA and foreign-namespace scripts", () => {
  const out = clean(svg(`<script>alert(1)</script><script><![CDATA[alert(2)]]></script>
    <h:script xmlns:h="http://www.w3.org/1999/xhtml">alert(3)</h:script><rect width="5" height="5"/>`));
  lacks(out, /script/i, /alert/);
  assert.match(out, /<rect/);
});

test("removes event handlers everywhere", () => {
  const out = clean(`<svg ${NS} viewBox="0 0 10 10" onload="alert(1)"><svg onload="alert(2)"><rect onclick="x()" ONMOUSEOVER="y()" width="1" height="1"/></svg></svg>`);
  lacks(out, /on\w+=/i, /alert/);
});

test("drops javascript:/external links and unwraps <a>", () => {
  const out = clean(svg(`<a href="javascript:alert(1)"><rect width="1" height="1"/></a>
    <a xlink:href="java&#x0A;script:alert(2)" xmlns:xlink="http://www.w3.org/1999/xlink"><circle r="1"/></a>`));
  lacks(out, /<a[\s>]/, /javascript/i, /alert/);
  assert.match(out, /<rect/); assert.match(out, /<circle/);
});

test("only same-document references survive on <use>; <image> only gets raster data URIs", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const out = clean(svg(`<defs><path id="p" d="M0 0h1"/></defs><use href="#p"/><use href="https://evil.example/x.svg#a"/>
    <image href="https://evil.example/track.png" width="1" height="1"/>
    <image href="data:image/svg+xml;base64,PHN2Zy8+" width="1" height="1"/>
    <image href="${png}" width="1" height="1"/>`));
  lacks(out, /evil/, /image\/svg/);
  assert.match(out, /xlink:href="#p"/);
  assert.ok(out.includes(png));
});

test("removes foreignObject, animation and other non-allow-listed elements", () => {
  const out = clean(svg(`<foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" src="https://evil.example"/></foreignObject>
    <animate attributeName="href" to="javascript:alert(1)"/><set attributeName="onload" to="alert(1)"/>
    <metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></metadata><rect width="1" height="1"/>`));
  lacks(out, /foreignObject/i, /iframe/, /animate/, /<set/, /metadata/, /evil/, /alert/);
});

test("CSS: no external url(), @import or expression(); local url(#id) is kept", () => {
  const out = clean(svg(`<style>@import url(https://evil.example/a.css); rect{fill:red}</style>
    <style>rect { fill: url(#g) } a > b {}</style>
    <rect style="background:url(https://evil.example/t.png)" width="1" height="1"/>
    <rect style="width:expression(alert(1))" width="1" height="1"/>
    <rect fill="url(https://evil.example/x#a)" width="1" height="1"/>
    <rect fill="url('#g')" width="1" height="1"/>
    <circle style="fill:red; background:url(https://evil.example/t.png); stroke:blue" r="1"/>`));
  lacks(out, /evil/, /@import/, /expression/);
  assert.match(out, /style="fill:red;stroke:blue"/);
  assert.match(out, /fill: url\(#g\)/);
  assert.match(out, /fill="url\(&apos;#g&apos;\)"/);
});

test("external and nested entities are never expanded (XXE, billion laughs)", () => {
  const xxe = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${svg("<text>&xxe;</text><rect width='1' height='1'/>")}`;
  lacks(clean(xxe), /passwd/, /root:/);
  const lol = `<!DOCTYPE svg [<!ENTITY a "lol"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">]>${svg("<text>&c;</text><rect width='1' height='1'/>")}`;
  const out = clean(lol);
  assert.ok(out.length < 1000, "no expansion");
});

test("rejects pathological nesting", () => {
  assert.throws(() => run(svg("<g>".repeat(200) + "<rect/>" + "</g>".repeat(200))), /nested too deeply/);
});

// ---------------- repair ----------------

test("adds a missing xmlns", () => {
  assert.match(clean(`<svg viewBox="0 0 4 4"><rect width="4" height="4"/></svg>`), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

test("strips BOM, junk before the markup and trailing garbage/NULs", () => {
  const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("garbage\n" + svg('<rect width="1" height="1"/>') + "\0\0\0trailing junk<<")]);
  clean(buf);
});

test("reads .svgz (gzip) and UTF-16 files", () => {
  clean(zlib.gzipSync(svg('<rect width="1" height="1"/>')));
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(svg('<text>Ünïcode</text><rect width="1" height="1"/>'), "utf16le")]);
  assert.match(clean(utf16), /Ünïcode/);
});

test("expands Illustrator-style namespace entities", () => {
  const ai = `<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
    <!ENTITY ns_svg "http://www.w3.org/2000/svg"><!ENTITY ns_xlink "http://www.w3.org/1999/xlink">]>
    <svg xmlns="&ns_svg;" xmlns:xlink="&ns_xlink;" width="20" height="10"><rect width="20" height="10"/></svg>`;
  assert.match(clean(ai), /viewBox="0 0 20 10"/);
});

test("fixes stray ampersands, HTML entities and undeclared xlink", () => {
  const out = clean(`<svg viewBox="0 0 9 9"><defs><rect id="r" width="1" height="1"/></defs><text>R&D&nbsp;&copy;</text><use xlink:href="#r"/></svg>`);
  assert.match(out, /R&amp;D/);
  assert.match(out, /xlink:href="#r"/);
});

test("derives viewBox from width/height (with units) and width/height from viewBox", () => {
  assert.match(clean(`<svg ${NS} width="100" height="50px"><rect width="1" height="1"/></svg>`), /viewBox="0 0 100 50" width="100" height="50"/);
  assert.match(clean(`<svg ${NS} width="25.4mm" height="1in"><rect width="1" height="1"/></svg>`), /viewBox="0 0 96 96"/);
  assert.match(clean(`<svg ${NS} viewBox="0 0 200 100" width="100%"><rect width="1" height="1"/></svg>`), /width="200" height="100"/);
  assert.match(clean(`<svg ${NS} viewBox="0,0,200,100" height="50"><rect width="1" height="1"/></svg>`), /width="100" height="50"/);
});

test("explains what's wrong with files it can't fix", () => {
  assert.throws(() => run(`<svg ${NS}><rect width="1" height="1"/></svg>`), /no size/);
  assert.throws(() => run(svg("")), /anything to draw/);
  assert.throws(() => run(`<svg ${NS} viewBox="0 0 1 1"><g><rect width="1"`), /damaged/);
  assert.throws(() => run("just some text"), /isn't an SVG/);
});
