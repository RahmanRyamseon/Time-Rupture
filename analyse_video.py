"""Describe what happens in a video using Gemini 2.5 Flash.

Usage:
    python analyse_video.py path/to/video.mp4
    python analyse_video.py path/to/video.mp4 --prompt "List every on-screen text"
"""

import argparse
import mimetypes
import os
import sys
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
DEFAULT_PROMPT = (
    "Describe what is happening in this video. Cover the setting, the people or "
    "objects involved, the sequence of events in order, and any notable audio or "
    "on-screen text."
)


def load_client() -> genai.Client:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        sys.exit("GEMINI_API_KEY is not set. Add it to your .env file.")
    return genai.Client(api_key=api_key)


def upload_and_wait(client: genai.Client, video_path: str) -> types.File:
    mime_type = mimetypes.guess_type(video_path)[0] or "video/mp4"
    print(f"Uploading {video_path} ...")
    video_file = client.files.upload(
        file=video_path,
        config=types.UploadFileConfig(mime_type=mime_type),
    )

    # Gemini processes videos after upload; generation fails until they are ACTIVE.
    while video_file.state.name == "PROCESSING":
        print("Processing video ...")
        time.sleep(5)
        video_file = client.files.get(name=video_file.name)

    if video_file.state.name == "FAILED":
        sys.exit(f"Gemini could not process the video: {video_file.error}")
    return video_file


def analyse_video(video_path: str, prompt: str = DEFAULT_PROMPT) -> str:
    client = load_client()
    video_file = upload_and_wait(client, video_path)

    print(f"Asking {MODEL} ...")
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[video_file, prompt],
        )
    finally:
        client.files.delete(name=video_file.name)  # Remove the upload whether or not the call worked.
    return response.text


def main() -> None:
    parser = argparse.ArgumentParser(description="Describe a video with Gemini 2.5 Flash.")
    parser.add_argument("video", help="Path to the video file (e.g. mp4, mov, webm)")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="Custom question about the video")
    args = parser.parse_args()

    if not os.path.isfile(args.video):
        sys.exit(f"File not found: {args.video}")

    print("\n" + analyse_video(args.video, args.prompt))


if __name__ == "__main__":
    main()
