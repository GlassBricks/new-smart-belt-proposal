#!/usr/bin/env python3
# Partly vibe coded

import sys
import re
import argparse


def remove_existing_labels(header_text: str) -> str:
    pattern = r"^\s*\d+(\.\d+)*\.?\s+"
    return re.sub(pattern, "", header_text).strip()


def get_header_level(line: str) -> int:
    return len(line) - len(line.lstrip("#"))


def process_markdown_headers(content: str, ignore_top_level: bool = False) -> str:
    lines = content.split("\n")
    numbering = [0] * 10
    result_lines = []

    for line in lines:
        stripped = line.strip()
        if not (stripped.startswith("#") and not stripped.startswith("```")):
            result_lines.append(line)
            continue

        level = get_header_level(stripped)
        header_text = stripped[level:].strip()
        clean_text = remove_existing_labels(header_text)

        if ignore_top_level and level == 1:
            result_lines.append(line)
            continue
        adjusted_level = level - 1 if not ignore_top_level else level
        numbering[adjusted_level] += 1
        for i in range(adjusted_level + 1, len(numbering)):
            numbering[i] = 0

        number_parts = [
            str(numbering[i]) for i in range(adjusted_level + 1) if numbering[i] > 0
        ]

        number_label = ".".join(number_parts)
        new_header = "#" * level + f" {number_label}. {clean_text}"
        result_lines.append(new_header)

    return "\n".join(result_lines)


def main():
    parser = argparse.ArgumentParser(
        description="Add hierarchical numbering to markdown headers"
    )
    parser.add_argument("file", help="Markdown file to process")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    parser.add_argument(
        "-w", "--write", action="store_true", help="Write output to file"
    )
    parser.add_argument(
        "-1",
        "--ignore-top-level",
        action="store_true",
        help="Skip numbering the topmost heading level",
    )

    args = parser.parse_args()

    try:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File '{args.file}' not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)

    processed_content = process_markdown_headers(content, args.ignore_top_level)

    out_file = args.file if args.write else args.output
    if out_file:
        try:
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(processed_content)
        except Exception as e:
            print(f"Error writing output file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(processed_content)


if __name__ == "__main__":
    main()
