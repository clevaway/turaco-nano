import sharp from 'sharp'

const dest = new URL('../public/', import.meta.url)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f8f7f4"/>
<circle cx="1150" cy="640" r="490" fill="#e6ebe1"/>
<circle cx="1150" cy="640" r="340" fill="#dce6d7"/>
<g font-family="Arial, Helvetica, sans-serif" fill="#242721">
<text x="72" y="88" font-size="30" font-weight="700" letter-spacing="-1">turaco-nano-tts-wes</text>
<text x="72" y="240" font-size="66" font-weight="500" letter-spacing="-3">Cameroon Pidgin,</text>
<text x="72" y="328" font-size="66" font-weight="500" letter-spacing="-3">in speech.</text>
<text x="75" y="403" font-size="25" fill="#70736a">Cameroon Pidgin English.</text>
<text x="75" y="443" font-size="25" fill="#70736a">An experiment from Project Turaco.</text>
<path d="M75 519H640" stroke="#d7dbcf"/>
<text x="75" y="566" font-size="18" fill="#53594d" letter-spacing="2">CLEVAWAY · RESEARCH PREVIEW</text>
</g></svg>`
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(new URL('social-preview-v2.png', dest).pathname)
console.log('Created text-only 1200 × 630 social preview.')
