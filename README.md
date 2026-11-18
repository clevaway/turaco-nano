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

## Temporary model lifecycle

Loading requires an explicit click: approximately 180 MB of model, config, tokenizer and pilot voice, plus the small WASM engine. Model fetches use `cache: 'no-store'` and omit credentials. There is no service worker, persistent model cache, CacheStorage, IndexedDB or localStorage.

Clear model terminates the dedicated worker, including in-flight downloads and generation, drops its WASM heap, pauses playback and revokes generated audio URLs. `pagehide` clears the model on navigation, including the back/forward cache. Closing a tab releases its resources; memory reclamation timing belongs to the browser. Download WAV is an explicit export that visitors can keep independently.

## Inference and verification

The CPU engine uses standard WASM SIMD, the exact adapted model, original tokenizer and pilot voice. Text is passed through without English normalization. Up to 300 characters per generation; mono 24 kHz WAV output. Physical device memory usage exceeds download size. Mobile speed and native-speaker speech quality still need measurement.

The initial implementation passed real model loading, generation and playback in a desktop browser; clear-after-result, clear-during-download, clear-during-generation and fresh unloaded-page checks also passed. The 390 px responsive layout had no horizontal overflow. TypeScript/build, WAV encoding and SEO-origin tests are available locally. Technical provenance, licenses and base-model attribution are retained in the [model card](https://huggingface.co/fotiecodes/turaco-nano-tts-wes#license-and-attribution) and source dependencies.


## Repository scope

This repository contains the browser demo, source components, tests, build configuration and social-preview image. The training notebook, corpus, model weights, recordings, checkpoints, local verification artifacts and dependency/build caches are excluded. Model assets are downloaded at runtime from the public, pinned Hugging Face release; no token is needed. The training notebook remains available separately in the model repository.


## License

The website source is MIT, copyright Clevaway. Model weights have their own license and provenance, documented in the linked model card; they are not included in this repository.
