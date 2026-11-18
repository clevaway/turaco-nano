# Turaco Nano TTS

A browser playground for [turaco-nano-tts-wes](https://huggingface.co/fotiecodes/turaco-nano-tts-wes), an experimental text-to-speech model for Cameroon Pidgin English. Part of Project Turaco, an independent applied AI research initiative focused on underrepresented African languages.

Speech is generated locally on the user's device. No account or inference server is required, and text is not uploaded for generation.

## Features

- Generate speech from Cameroon Pidgin text, with example phrases to get started.
- Download the voice on first use (approximately 180 MB), then reuse it across visits.
- Generate speech offline once the app and voice have been saved.
- Play generated audio automatically and export it as a WAV file.

The model is a research preview. Pronunciation, accent and intonation can vary; native-speaker evaluation and mobile performance measurements are still needed. See the [model card](https://huggingface.co/fotiecodes/turaco-nano-tts-wes) for training details, evaluation limits and attribution.

## Getting started

Install dependencies and start the development server:

```sh
npm ci
npm run dev
```

Create and preview a production build:

```sh
npm run build
npm run preview
```

Run the checks:

```sh
npm test
npm run lint
```

Built with React, TypeScript, Vite and shadcn/ui. Speech runs in a dedicated CPU worker using WebAssembly SIMD. Model assets are fetched from a pinned public Hugging Face revision; no API token is required.

## Offline use and storage

The first generation downloads the model, tokenizer, configuration and voice. Complete downloads are saved in browser storage and reused. Closing a tab does not remove them, and the app applies no expiration period. Canceling generation preserves saved downloads.

The production build includes a service worker that saves the app and speech engine for offline visits. Use a production build to test offline reopening; the development server does not provide the full offline experience.

Storage belongs to each site origin. Users can remove saved files through their browser's site-data settings. The app requests persistent storage where supported, but browsers may still clear data under storage pressure or in private browsing.

## Hosting

The production build is a static site in `dist/` and can be served by a static hosting provider. Set `SITE_URL` to the public origin at build time to generate canonical links, social-preview URLs and a sitemap. Hosting configuration for Vercel is included.

## Contributing

Bug reports, accessibility improvements and contributions are welcome. For speech or performance issues, include the example text, browser and device, and whether the model was already downloaded. Avoid sharing private or sensitive text.

Before submitting a change, run the checks and production build above. Changes to speech generation or storage should also be tested in the browser, including offline use when relevant.

This repository contains the browser app, tests and build tools. Model weights and the training notebook are available separately in the [Hugging Face model repository](https://huggingface.co/fotiecodes/turaco-nano-tts-wes/tree/main).

## License

The website source is [MIT licensed](LICENSE), copyright Clevaway. Model weights and runtime dependencies have their own licenses; see the [model card's license and attribution section](https://huggingface.co/fotiecodes/turaco-nano-tts-wes#license-and-attribution) and dependency notices.
