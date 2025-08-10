#!/usr/bin/env python3
# Partly vibe coded

import sys
import re
import argparse


def extract_and_remove_labels(header_text: str) -> tuple[str, str]:
    """Extract existing number from header text and return cleaned text.
    Returns tuple of (existing_number, cleaned_text)."""
    pattern = r"^\s*(\d+(?:\.\d+)*\.?)\s+"
    match = re.match(pattern, header_text)

    if match:
        existing_number = match.group(1).rstrip(".")
        cleaned_text = re.sub(pattern, "", header_text).strip()
        return existing_number, cleaned_text
    else:
        return "", header_text.strip()


def update_section_references(content: str, number_mapping: dict) -> str:
    """Update section references in text based on number mapping."""
    if not number_mapping:
        return content

    # Create pattern to match section references
    # Matches optional formatting, "section" (case insensitive), optional formatting, and a number
    pattern = r"([_*]*\s*section\s*[_*]*\s*)(\d+(?:\.\d+)*)([_*]*)"

    def replace_reference(match):
        prefix = match.group(1)
        old_number = match.group(2)
        suffix = match.group(3)

        # Check if this old number should be updated
        if old_number in number_mapping:
            return prefix + number_mapping[old_number] + suffix
        return match.group(0)  # Return unchanged if no mapping found

    return re.sub(pattern, replace_reference, content, flags=re.IGNORECASE)


def get_header_level(line: str) -> int:
    return len(line) - len(line.lstrip("#"))


def process_markdown_headers(
    content: str, ignore_top_level: bool = False
) -> tuple[str, dict]:
    lines = content.split("\n")
    numbering = [0] * 10
    result_lines = []
    number_mapping: dict[str, str] = {}

    for line in lines:
        stripped = line.strip()
        if not (stripped.startswith("#") and not stripped.startswith("```")):
            result_lines.append(line)
            continue

        level = get_header_level(stripped)
        header_text = stripped[level:].strip()
        old_number, clean_text = extract_and_remove_labels(header_text)

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

        # Track the mapping if the number changed
        if old_number and old_number != number_label:
            number_mapping[old_number] = number_label

        new_header = "#" * level + f" {number_label}. {clean_text}"
        result_lines.append(new_header)

    return "\n".join(result_lines), number_mapping


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

    processed_content, number_mapping = process_markdown_headers(
        content, args.ignore_top_level
    )

    # Update section references based on number changes
    processed_content = update_section_references(processed_content, number_mapping)

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
