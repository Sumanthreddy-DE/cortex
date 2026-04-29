# YouTube Distiller Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `tools/youtube-distiller/` prototype that converts a YouTube URL into local `note.md`, `data.json`, and `transcript.txt` outputs using `yt-dlp` plus an OpenAI-compatible chat completions endpoint.

**Architecture:** Keep the prototype outside Cortex's Electron app and database. Implement focused Node ESM modules for config, YouTube metadata/transcript extraction, transcript normalization, local or hosted OpenAI-compatible inference, output parsing, and file writing. Add unit tests around pure logic and mocked subprocess/API boundaries so the tool can be refined before Cortex integration.

**Tech Stack:** Node ESM, built-in `fetch`, built-in `child_process`, built-in `fs/promises`, Vitest, external `yt-dlp` installed on PATH, OpenAI-compatible `/v1/chat/completions` provider.

---

## File Structure

- Create `tools/youtube-distiller/README.md`: usage, setup, provider config, Git safety notes.
- Create `tools/youtube-distiller/src/config.js`: read and validate environment variables.
- Create `tools/youtube-distiller/src/youtube.js`: call `yt-dlp`, parse video id, select transcript URL, fetch transcript text.
- Create `tools/youtube-distiller/src/transcript.js`: strip VTT syntax, normalize transcript lines, map transcript into chapter sections.
- Create `tools/youtube-distiller/src/prompts.js`: build classification and distillation prompts.
- Create `tools/youtube-distiller/src/llm.js`: call OpenAI-compatible chat completions.
- Create `tools/youtube-distiller/src/distill.js`: classify content, request structured JSON, validate normalized result.
- Create `tools/youtube-distiller/src/writer.js`: write `note.md`, `data.json`, and `transcript.txt`.
- Create `tools/youtube-distiller/src/index.js`: CLI entrypoint.
- Create `tests/unit/youtube-distiller/*.test.ts`: focused unit tests.
- Modify `package.json`: add `yt:distill` script.
- Modify `.gitignore`: ignore `tools/youtube-distiller/outputs/`.

---

### Task 1: Config And Git Safety

**Files:**
- Create: `tools/youtube-distiller/src/config.js`
- Create: `tests/unit/youtube-distiller/config.test.ts`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write failing config tests**

```ts
import { describe, expect, it } from 'vitest'
import { loadConfig, normalizeBaseUrl } from '../../../tools/youtube-distiller/src/config.js'

describe('youtube distiller config', () => {
  it('normalizes a provider base URL with a trailing slash', () => {
    expect(normalizeBaseUrl('https://integrate.api.nvidia.com/v1/')).toBe('https://integrate.api.nvidia.com/v1')
  })

  it('loads defaults without requiring Ollama or LM Studio', () => {
    const config = loadConfig({
      LLM_BASE_URL: 'https://integrate.api.nvidia.com/v1',
      LLM_MODEL: 'nvidia/test-model',
      LLM_API_KEY: 'nvapi-test',
      YOUTUBE_DISTILLER_OUTPUT_DIR: 'custom-output'
    })

    expect(config.llmBaseUrl).toBe('https://integrate.api.nvidia.com/v1')
    expect(config.llmModel).toBe('nvidia/test-model')
    expect(config.llmApiKey).toBe('nvapi-test')
    expect(config.outputDir).toBe('custom-output')
  })

  it('uses local-friendly defaults when provider variables are omitted', () => {
    const config = loadConfig({})

    expect(config.llmBaseUrl).toBe('http://127.0.0.1:1234/v1')
    expect(config.llmModel).toBe('local-model')
    expect(config.llmApiKey).toBe('not-needed')
    expect(config.outputDir).toBe('tools/youtube-distiller/outputs')
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:unit -- tests/unit/youtube-distiller/config.test.ts`

Expected: FAIL because `tools/youtube-distiller/src/config.js` does not exist.

- [ ] **Step 3: Implement config module**

```js
export function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

export function loadConfig(env = process.env) {
  return {
    llmBaseUrl: normalizeBaseUrl(env.LLM_BASE_URL || env.LOCAL_LLM_BASE_URL || 'http://127.0.0.1:1234/v1'),
    llmModel: String(env.LLM_MODEL || env.LOCAL_LLM_MODEL || 'local-model').trim(),
    llmApiKey: String(env.LLM_API_KEY || env.LOCAL_LLM_API_KEY || 'not-needed').trim(),
    outputDir: String(env.YOUTUBE_DISTILLER_OUTPUT_DIR || 'tools/youtube-distiller/outputs').trim()
  }
}

export function assertConfig(config) {
  if (!config.llmBaseUrl) throw new Error('LLM_BASE_URL is empty')
  if (!config.llmModel) throw new Error('LLM_MODEL is empty')
  if (!config.outputDir) throw new Error('YOUTUBE_DISTILLER_OUTPUT_DIR is empty')
}
```

- [ ] **Step 4: Add npm script and gitignore entry**

`package.json` scripts entry:

```json
"yt:distill": "node tools/youtube-distiller/src/index.js"
```

`.gitignore` entry:

```text
tools/youtube-distiller/outputs/
```

- [ ] **Step 5: Run the test and commit**

Run: `npm run test:unit -- tests/unit/youtube-distiller/config.test.ts`

Expected: PASS.

Commit:

```bash
git add package.json .gitignore tools/youtube-distiller/src/config.js tests/unit/youtube-distiller/config.test.ts
git commit -m "feat: add youtube distiller config"
```

### Task 2: YouTube Metadata And Transcript Extraction

**Files:**
- Create: `tools/youtube-distiller/src/youtube.js`
- Create: `tests/unit/youtube-distiller/youtube.test.ts`

- [ ] **Step 1: Write failing extraction tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  parseYouTubeVideoId,
  selectCaptionTrack,
  toVideoMetadata
} from '../../../tools/youtube-distiller/src/youtube.js'

describe('youtube helpers', () => {
  it('parses standard and short YouTube URLs', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=abc123XYZ_0')).toBe('abc123XYZ_0')
    expect(parseYouTubeVideoId('https://youtu.be/abc123XYZ_0')).toBe('abc123XYZ_0')
  })

  it('selects English subtitles before auto captions', () => {
    const info = {
      subtitles: { en: [{ url: 'manual-en', ext: 'vtt' }] },
      automatic_captions: { en: [{ url: 'auto-en', ext: 'vtt' }] }
    }

    expect(selectCaptionTrack(info).url).toBe('manual-en')
  })

  it('maps yt-dlp metadata into stable fields', () => {
    const metadata = toVideoMetadata('https://youtu.be/abc123XYZ_0', {
      id: 'abc123XYZ_0',
      title: 'Five Habits I Should Have',
      channel: 'Example Channel',
      duration: 1234,
      upload_date: '20260401',
      chapters: [{ title: 'Habit 1', start_time: 0, end_time: 120 }]
    })

    expect(metadata.videoId).toBe('abc123XYZ_0')
    expect(metadata.title).toBe('Five Habits I Should Have')
    expect(metadata.publishedDate).toBe('2026-04-01')
    expect(metadata.chapters[0]).toEqual({ title: 'Habit 1', start: 0, end: 120 })
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:unit -- tests/unit/youtube-distiller/youtube.test.ts`

Expected: FAIL because `youtube.js` does not exist.

- [ ] **Step 3: Implement YouTube helpers and subprocess boundary**

Implement `parseYouTubeVideoId`, `selectCaptionTrack`, `toVideoMetadata`, `getYoutubeInfo`, `fetchTranscript`, and `checkYtDlpAvailable`. Use `child_process.execFile` with `yt-dlp --dump-single-json --skip-download <url>`. Use `fetch` for the selected caption URL.

- [ ] **Step 4: Run test and commit**

Run: `npm run test:unit -- tests/unit/youtube-distiller/youtube.test.ts`

Expected: PASS.

Commit:

```bash
git add tools/youtube-distiller/src/youtube.js tests/unit/youtube-distiller/youtube.test.ts
git commit -m "feat: extract youtube metadata and captions"
```

### Task 3: Transcript Normalization

**Files:**
- Create: `tools/youtube-distiller/src/transcript.js`
- Create: `tests/unit/youtube-distiller/transcript.test.ts`

- [ ] **Step 1: Write failing transcript tests**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeVttTranscript, splitTranscriptByChapters } from '../../../tools/youtube-distiller/src/transcript.js'

describe('transcript normalization', () => {
  it('removes VTT timestamps and duplicate text lines', () => {
    const text = `WEBVTT

00:00:00.000 --> 00:00:02.000
hello world
hello world

00:00:02.000 --> 00:00:04.000
next idea`

    expect(normalizeVttTranscript(text)).toBe('hello world\nnext idea')
  })

  it('creates chapter sections when chapters exist', () => {
    const sections = splitTranscriptByChapters('one two three four five six', [
      { title: 'Intro', start: 0, end: 10 },
      { title: 'Main', start: 10, end: 20 }
    ])

    expect(sections.map((section) => section.title)).toEqual(['Intro', 'Main'])
    expect(sections[0].text.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:unit -- tests/unit/youtube-distiller/transcript.test.ts`

Expected: FAIL because `transcript.js` does not exist.

- [ ] **Step 3: Implement normalization**

Implement VTT cleanup, repeated-line dedupe, whitespace normalization, and a simple chapter splitter. The first splitter can divide transcript text evenly across chapters because VTT timestamps are not preserved in the normalized text.

- [ ] **Step 4: Run test and commit**

Run: `npm run test:unit -- tests/unit/youtube-distiller/transcript.test.ts`

Expected: PASS.

Commit:

```bash
git add tools/youtube-distiller/src/transcript.js tests/unit/youtube-distiller/transcript.test.ts
git commit -m "feat: normalize youtube transcripts"
```

### Task 4: OpenAI-Compatible LLM Adapter

**Files:**
- Create: `tools/youtube-distiller/src/llm.js`
- Create: `tests/unit/youtube-distiller/llm.test.ts`

- [ ] **Step 1: Write failing LLM tests**

```ts
import { describe, expect, it, vi } from 'vitest'
import { chatCompletion } from '../../../tools/youtube-distiller/src/llm.js'

describe('llm adapter', () => {
  it('calls an OpenAI-compatible chat completions endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] })
    })

    const result = await chatCompletion({
      config: {
        llmBaseUrl: 'https://integrate.api.nvidia.com/v1',
        llmModel: 'nvidia/test-model',
        llmApiKey: 'nvapi-test',
        outputDir: 'outputs'
      },
      messages: [{ role: 'user', content: 'Return JSON' }],
      fetchImpl: fetchMock
    })

    expect(result).toBe('{"ok":true}')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer nvapi-test' })
      })
    )
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:unit -- tests/unit/youtube-distiller/llm.test.ts`

Expected: FAIL because `llm.js` does not exist.

- [ ] **Step 3: Implement LLM adapter**

Implement `chatCompletion({ config, messages, fetchImpl = fetch })` using `POST ${config.llmBaseUrl}/chat/completions`, JSON body `{ model, messages, temperature: 0.2, response_format: { type: 'json_object' } }`, and return `choices[0].message.content`.

- [ ] **Step 4: Run test and commit**

Run: `npm run test:unit -- tests/unit/youtube-distiller/llm.test.ts`

Expected: PASS.

Commit:

```bash
git add tools/youtube-distiller/src/llm.js tests/unit/youtube-distiller/llm.test.ts
git commit -m "feat: add openai compatible llm adapter"
```

### Task 5: Prompts, Distillation, And Markdown Writer

**Files:**
- Create: `tools/youtube-distiller/src/prompts.js`
- Create: `tools/youtube-distiller/src/distill.js`
- Create: `tools/youtube-distiller/src/writer.js`
- Create: `tests/unit/youtube-distiller/distill.test.ts`
- Create: `tests/unit/youtube-distiller/writer.test.ts`

- [ ] **Step 1: Write failing distillation and writer tests**

Test that JSON wrapped in markdown fences is parsed, missing optional arrays become empty arrays, and `note.md` sections appear in the approved order: Actionable Takeaways, Chapter Notes, Commands / Snippets, Tools, People, Links Mentioned, Full Compact Summary.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm run test:unit -- tests/unit/youtube-distiller/distill.test.ts tests/unit/youtube-distiller/writer.test.ts`

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement prompts, parser, and writer**

Implement a strict JSON schema in the prompt, parser cleanup for fenced JSON, defaults for missing arrays, safe output folder names, and Markdown generation with the approved section order.

- [ ] **Step 4: Run tests and commit**

Run: `npm run test:unit -- tests/unit/youtube-distiller/distill.test.ts tests/unit/youtube-distiller/writer.test.ts`

Expected: PASS.

Commit:

```bash
git add tools/youtube-distiller/src/prompts.js tools/youtube-distiller/src/distill.js tools/youtube-distiller/src/writer.js tests/unit/youtube-distiller/distill.test.ts tests/unit/youtube-distiller/writer.test.ts
git commit -m "feat: write distilled youtube notes"
```

### Task 6: CLI And Documentation

**Files:**
- Create: `tools/youtube-distiller/src/index.js`
- Create: `tools/youtube-distiller/README.md`
- Create: `tests/unit/youtube-distiller/cli.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Test that missing URL exits with usage text and that the CLI orchestration can be called with mocked extraction, LLM, and writer dependencies.

- [ ] **Step 2: Run test and verify it fails**

Run: `npm run test:unit -- tests/unit/youtube-distiller/cli.test.ts`

Expected: FAIL because `index.js` does not exist.

- [ ] **Step 3: Implement CLI**

Implement `runCli(argv, deps)` and executable behavior. The CLI should print the output directory after success and print actionable error messages for missing `yt-dlp`, missing transcript, unreachable LLM endpoint, or parse failure.

- [ ] **Step 4: Write README**

Document:

```bash
npm run yt:distill -- "https://www.youtube.com/watch?v=..."
```

Document provider examples:

```text
LLM_BASE_URL=http://127.0.0.1:1234/v1
LLM_MODEL=local-model
LLM_API_KEY=not-needed
```

```text
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_MODEL=<nvidia-model-id>
LLM_API_KEY=<nvapi-key>
```

- [ ] **Step 5: Run full verification and commit**

Run:

```bash
npm run test:unit -- tests/unit/youtube-distiller
npm run typecheck
```

Expected: PASS.

Commit:

```bash
git add tools/youtube-distiller tests/unit/youtube-distiller package.json .gitignore
git commit -m "feat: add youtube distiller cli"
```

## Self-Review

- Spec coverage: The plan implements isolated prototype, external `yt-dlp`, OpenAI-compatible provider config, generated Markdown/JSON/transcript files, adaptive content classification, Git safety, and no Cortex UI/DB changes.
- Placeholder scan: No `TBD` or unresolved implementation placeholders remain; Task 5 and Task 6 describe exact behaviors and files even where code blocks are summarized to avoid duplicating large modules.
- Type consistency: Config names use generic `LLM_*` while still accepting legacy `LOCAL_LLM_*` aliases. Output field names match the design spec.
