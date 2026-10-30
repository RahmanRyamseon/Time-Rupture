# OpenMontage (keyless)

[OpenMontage](https://github.com/calesthio/OpenMontage) is an open-source agentic
video production system: you describe a video in plain language and your AI coding
assistant handles research, scripting, asset generation, editing and rendering.

This directory holds a setup script only. OpenMontage itself is **not** vendored
here — it is a 164 MB tree under AGPL-3.0, and the install grows to roughly 870 MB
once dependencies are in. The script clones it outside this repo instead.

## Install

```bash
./openmontage/setup.sh
```

Installs to `~/openmontage/OpenMontage` by default. Takes a few minutes, mostly
`pip` and `npm`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENMONTAGE_DIR` | `~/openmontage/OpenMontage` | Where to install |
| `OPENMONTAGE_REF` | pinned commit `195eab2` | Set to `main` to track upstream |
| `OPENMONTAGE_REPO` | upstream URL | Point at a fork |

The script is idempotent — rerun it to update an existing checkout.

## No API keys needed

The generated `.env` is left with every key blank, which is a working
configuration:

- **Narration** — Piper, running offline on your machine
- **Footage** — open archival sources
- **Rendering** — Remotion and FFmpeg, both local

Piper ships no voice of its own, so the script downloads one
(`en_US-lessac-medium`) from huggingface.co into `~/.piper/models`. That is free
and needs no key, but it is the one step a restricted network can block — the
script warns and prints the command to rerun rather than failing. Override with
`PIPER_VOICE` or `PIPER_VOICE_DIR`. Without a voice, narration falls back to a
cloud provider, which needs a key.

Adding keys to `.env` later unlocks the paid cloud providers (FAL, ElevenLabs,
Runway, Suno and others). Those bill per call, and a failed generation you retry
costs money each time.

## Requirements

Python 3.10+, Node 18+, FFmpeg, git. The script checks all four and stops with a
clear message if any is missing.

## Notes

- `npm install` reports vulnerabilities in the pinned Remotion dependency tree.
  `npm audit fix` is deliberately not run, since it can break the renderer.
- OpenMontage is AGPL-3.0, which is more restrictive than this repo. Keeping it
  as an external checkout rather than vendored code keeps the licenses separate.
- Upstream's own install note for the voice model (`piper --download-dir ...`)
  is stale for piper-tts 1.8.0. The script uses the current
  `python -m piper.download_voices` instead.
- Verified on 2026-10-29 at commit `195eab2` with Python 3.13.17, Node 22.22.0
  and FFmpeg 6.1.1.
