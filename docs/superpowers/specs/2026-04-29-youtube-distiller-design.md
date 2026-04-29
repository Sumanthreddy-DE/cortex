# YouTube Distiller Prototype Design

Date: 2026-04-29
Status: Draft for review

## Goal

Build a separate local prototype inside the Cortex repository that turns YouTube videos into compact, actionable learning notes. The prototype should validate transcript extraction, local-model distillation quality, and output structure before any Cortex UI or database integration.

The feature is for personal use. It should stay local-first, avoid cloud dependencies, and support more than developer videos. It must work for technical tutorials, long podcasts, habit/lifestyle videos, demos, and general explainers.

## Non-Goals

- Do not add Cortex UI, API routes, database tables, or Electron IPC in this phase.
- Do not vendor `yt-dlp`, `yt-dlp.exe`, downloaded media, generated transcripts, or generated notes into Git.
- Do not require OpenAI, Claude, or any hosted LLM provider.
- Do not build a separate long-term app. The prototype is isolated, but Cortex remains the intended final home.
- Do not download full video/audio by default. Prefer subtitles/transcripts and metadata.

## Recommended Approach

Create a separate tool under:

```text
tools/youtube-distiller/
```

The tool will be runnable from the Cortex repo, but isolated from the Electron app. It will use:

- `yt-dlp` from the user's PATH for YouTube metadata, chapters, and subtitles.
- A local OpenAI-compatible LLM endpoint for classification and distillation.
- Local Markdown, JSON, and transcript files for outputs.

This approach keeps experimentation cheap. We can test 10-20 real videos, refine prompts and output format, then integrate the stable pipeline into Cortex later.

## Runtime Assumptions

The prototype assumes the user has installed `yt-dlp` separately and made it available on PATH. The repo will only document this dependency.

The local model should be configured through environment variables:

```text
LOCAL_LLM_BASE_URL=http://127.0.0.1:1234/v1
LOCAL_LLM_MODEL=qwen3:latest
LOCAL_LLM_API_KEY=not-needed
YOUTUBE_DISTILLER_OUTPUT_DIR=tools/youtube-distiller/outputs
```

The model runtime is intentionally generic. LM Studio, Ollama-compatible setups, vLLM, llama.cpp servers, or other local runtimes can be used if they expose an OpenAI-compatible chat completions endpoint.

## Proposed Structure

```text
tools/youtube-distiller/
  README.md
  outputs/
  src/
    index.ts
    config.ts
    youtube.ts
    transcript.ts
    classify.ts
    distill.ts
    writer.ts
```

`outputs/` must be ignored by Git.

## CLI

Add a repo-level npm script:

```text
npm run yt:distill -- "https://www.youtube.com/watch?v=..."
```

The command should:

1. Validate config and check that `yt-dlp` is available.
2. Fetch YouTube metadata, chapters, and subtitles/transcript using `yt-dlp`.
3. Normalize transcript text and align it with chapters when chapter data exists.
4. Classify the video type.
5. Ask the local LLM for structured distilled output.
6. Save generated files locally.
7. Print the output folder path.

## Output Files

For each processed video, write:

```text
outputs/
  <safe-video-title-or-id>/
    note.md
    data.json
    transcript.txt
```

`note.md` is the human-readable result.

`data.json` stores structured fields for future Cortex integration:

- source URL
- video id
- title
- channel
- duration
- published date when available
- chapters
- detected content type
- actionable takeaways
- chapter notes
- commands or snippets
- tools, people, links, or resources mentioned
- compact summary
- model/runtime metadata
- created timestamp

`transcript.txt` stores the normalized transcript for debugging and prompt iteration.

## Note Format

Default `note.md` order:

1. Actionable Takeaways
2. Chapter Notes
3. Commands / Snippets
4. Tools, People, Links Mentioned
5. Full Compact Summary

The format should adapt to content type:

- Technical/tutorial videos: commands, setup steps, configs, gotchas, implementation checklist.
- Podcasts/interviews: topic timeline, main arguments, claims worth revisiting, useful ideas, people/tools/papers mentioned.
- Habit/lifestyle videos: numbered takeaways, behavior changes, routines, checklist items.
- Product/tool demos: what changed, when to use it, setup steps, limitations.
- General explainers: concepts, definitions, examples, follow-up questions.

## Classification

Classify each video into one primary type:

- `tutorial`
- `podcast`
- `habit`
- `demo`
- `explainer`
- `other`

The classifier should use title, description, chapters, and transcript excerpt. Classification can be LLM-based in the prototype, but the result must be stored in `data.json`.

## Prompting Requirements

The distillation prompt should ask for concise, practical output. It should avoid generic summaries and prioritize material the user can act on later.

The model should be instructed to:

- Preserve exact commands, flags, config keys, package names, URLs, and code snippets when present.
- Mark uncertain commands as uncertain instead of inventing syntax.
- Keep chapter notes to one or two lines each.
- Extract numbered lists from habit and advice videos.
- Identify claims worth verifying in podcasts.
- Keep output compact enough to skim.

## Failure Handling

The CLI should fail clearly when:

- `yt-dlp` is missing.
- No transcript/subtitles are available.
- The local LLM endpoint is unreachable.
- The model response cannot be parsed into the expected structure.

For missing chapters, the tool should still produce a note using transcript-derived sections or a whole-video summary.

For missing transcript, the first prototype should report the problem instead of downloading audio and transcribing it. Audio transcription can be a later phase.

## Future Cortex Integration

After the prototype output is validated, Cortex can integrate this pipeline by:

- Adding a `Distill` action for YouTube link items.
- Saving generated Markdown as an item note.
- Adding tags such as `YouTube`, `distilled`, `commands`, `podcast`, or `habit`.
- Extending search so distilled note entries are discoverable.
- Showing a small distilled status on cards or in the edit modal.

The final integration should reuse the prototype pipeline instead of duplicating extraction and prompting logic.

## Testing Strategy

Prototype testing should focus on the pipeline units and real sample outputs:

- Config validation tests.
- YouTube URL/video id parsing tests.
- Transcript normalization tests.
- Markdown/data writer tests.
- Prompt/output parser tests using fixture responses.

Manual validation should run the tool against a small set of real videos:

- AI/dev tutorial with commands.
- Long podcast or interview.
- Habit/lifestyle video with numbered advice.
- Product/tool demo.
- General explainer.

## Open Decisions

- Which local runtime will be used first.
- Which model gives the best balance of quality and speed.
- Whether audio transcription is needed for videos without subtitles.
- Whether generated notes should later be stored as one item note or multiple typed note entries in Cortex.
