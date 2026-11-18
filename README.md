# turaco-nano-tts-wes

A standalone browser playground by [Clevaway](https://clevaway.com) for the `turaco-nano-tts-wes` Cameroon Pidgin English speech model. React, Vite, TypeScript and shadcn/ui. All speech is generated on the visitor's device.

## Development

```sh
npm ci
npm run dev
npm run build
npm run preview
npm test
```

## Deploy with GitHub and Vercel

Import `clevaway/turaco-nano` from the Vercel dashboard. Keep **Root Directory** as `.`.

Vercel uses the checked-in `vercel.json`: Vite preset, `npm run build`, and output directory `dist`. No inference server, backend token or model upload is needed. Public model files are already pinned to an immutable Hugging Face commit. There is no automatic publishing script or platform-specific source synchronization.

SEO metadata is present in the initial HTML for link crawlers. The build automatically reads Vercel's production-domain environment variable to create canonical URLs, absolute social-image URLs, structured data, `robots.txt` and a sitemap. Vercel preview deployments use `noindex`. For another host, `SITE_URL` is an optional build-time origin override. No domain setup is required for local development.

## Brand assets

The website uses a text wordmark, an empty favicon, and a text-only 1200 × 630 social preview in `public/social-preview-v2.png`. Run `npm run assets` to regenerate the preview.

## Download once, use again offline

Enter text and click **Generate speech**. First use downloads approximately 180 MB of model, config, tokenizer and pilot voice, then generates that text automatically. There is no separate model-loading step. Future visits reuse the saved files before making any model network request.

Complete model files are saved in CacheStorage at their immutable Hugging Face URLs. Downloads are checked against exact expected byte counts before saving; interrupted files are retried, while completed files are reused. There is no application expiry, age limit, automatic cleanup or deletion on tab/browser close. Cancel stops current work and frees working memory while preserving saved files. Browser storage is specific to the site origin, so development and production hosts have separate downloads.

The production build includes a service worker that saves the page, JavaScript, fonts, speech worker and WASM engine. Once both page and voice are saved, the site can reopen and generate speech without internet. `npm run dev` supports saved model files; use `npm run build` and `npm run preview` to verify offline reopening. App updates preserve model downloads and previously saved app files.

The app requests persistent browser storage to reduce automatic eviction. Browsers control whether it is granted and can still remove site data, particularly in private browsing or under storage pressure; no website can promise permanent storage. The UI reports storage failures without blocking current speech and only advertises offline availability when the page and model are both saved. Visitors can remove the download themselves through their browser's site-data settings. There is no account, speech server or uploaded text.

## Example phrases

The first supplied Pidgin phrase is shown on arrival. Try an example cycles through the 20 provided phrases, preserving their wording; the first phrase is also a static placeholder when the field is empty. There is no typing animation.

## Inference and verification

The CPU engine uses standard WASM SIMD, the exact adapted model, original tokenizer and pilot voice. Text is passed through without English normalization. Up to 300 characters per generation; mono 24 kHz WAV output. Physical device memory usage exceeds download size. Mobile speed and native-speaker speech quality still need measurement.

The production build passed real first-click downloading, saving, generation and playback. With the preview server stopped, closing and reopening a tab still loaded the page and generated the first supplied example: 7.04 seconds of audio with **0 model bytes downloaded**. Cancel preserved the saved voice. All 20 examples cycled and wrapped back to the first, and the 390 px layout had no horizontal overflow. Twelve regression tests cover saved-file reuse without network access, interrupted/corrupt downloads, storage limits, pinned revisions, native fetch invocation, offline navigation/assets, reuse of the speech engine across app updates, SEO origins and WAV encoding.

Technical provenance, licenses and base-model attribution are retained in the [model card](https://huggingface.co/fotiecodes/turaco-nano-tts-wes#license-and-attribution) and source dependencies.

## Repository scope

This repository contains the browser demo, source components, tests, build configuration and social-preview image. The training notebook, corpus, model weights, recordings, checkpoints, local verification artifacts and dependency/build caches are excluded. Model assets are downloaded at runtime from the public, pinned Hugging Face release; no token is needed. The training notebook remains available separately in the model repository.


## License

The website source is MIT, copyright Clevaway. Model weights have their own license and provenance, documented in the linked model card; they are not included in this repository.
