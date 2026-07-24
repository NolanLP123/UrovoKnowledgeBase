#!/usr/bin/env python3
"""Extract Urovo USDK interface tables from the source DOCX into knowledge.json."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph


def iter_blocks(document):
    for child in document.element.body.iterchildren():
        if child.tag.endswith("}p"):
            yield Paragraph(child, document)
        elif child.tag.endswith("}tbl"):
            yield Table(child, document)


def clean(value: str) -> str:
    value = value.replace("\xa0", " ").replace("\r", "\n")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def slug(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or "api"


def unique_row_values(row) -> list[str]:
    values = []
    for cell in row.cells:
        text = clean(cell.text)
        if text and text not in values:
            values.append(text)
    return values


def parse_table(table: Table) -> dict:
    record = {"signature": "", "description": "", "parameters": [], "returns": ""}
    for row in table.rows:
        values = unique_row_values(row)
        if not values:
            continue
        label = values[0].lower()
        payload = values[1:]
        if label == "define":
            record["signature"] = payload[0] if payload else ""
        elif label == "describe":
            record["description"] = payload[0] if payload else ""
        elif label == "parameters":
            if not payload:
                continue
            if payload[0].strip().lower() == "name" and any(
                item.strip().lower() in {"type", "note"} for item in payload[1:]
            ):
                continue
            if len(payload) == 1:
                name, detail = "", payload[0]
            else:
                name, detail = payload[0], "\n".join(payload[1:])
            record["parameters"].append({"name": name, "description": detail})
        elif label == "return":
            record["returns"] = "\n".join(payload)
    return record


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("docx")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    document = Document(args.docx)
    current_module = ""
    pending_api = None
    entries = []
    used_ids: dict[str, int] = {}
    in_interfaces = False

    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            text = clean(block.text)
            style = block.style.name if block.style else ""
            if style == "Heading 1":
                in_interfaces = text.startswith("III.")
            elif in_interfaces and style == "Heading 2":
                current_module = re.sub(r"^\d+(?:\.\d+)*\s+", "", text)
            elif in_interfaces and style == "Heading 3":
                pending_api = re.sub(r"^\d+(?:\.\d+)*\s+", "", text)
        elif in_interfaces and pending_api:
            parsed = parse_table(block)
            base_id = slug(f"{current_module}-{pending_api}")
            used_ids[base_id] = used_ids.get(base_id, 0) + 1
            entry_id = base_id if used_ids[base_id] == 1 else f"{base_id}-{used_ids[base_id]}"
            deprecated = "deprecated" in pending_api.lower() or "deprecated" in parsed["description"].lower()
            entries.append(
                {
                    "id": entry_id,
                    "category": "USDK API",
                    "module": current_module,
                    "title": pending_api,
                    "summary": parsed["description"],
                    "signature": parsed["signature"],
                    "parameters": parsed["parameters"],
                    "returns": parsed["returns"],
                    "minAndroid": "",
                    "models": [],
                    "status": "Deprecated" if deprecated else "Active",
                    "keywords": " ".join(
                        [
                            current_module,
                            pending_api,
                            parsed["signature"],
                            parsed["description"],
                            parsed["returns"],
                        ]
                    ),
                    "source": "USDK Interface documentation_V15.5.01E.docx",
                    "version": "V15.5.01E",
                }
            )
            pending_api = None

    payload = {
        "meta": {
            "title": "Urovo Technical Knowledge Base",
            "subtitle": "USDK API and enterprise device management reference",
            "version": "V15.5.01E",
            "entryCount": len(entries),
            "generatedFrom": Path(args.docx).name,
        },
        "categories": [
            {"name": "USDK API", "enabled": True},
            {"name": "OEMConfig", "enabled": False},
            {"name": "Ustage", "enabled": False},
            {"name": "OTA", "enabled": False},
            {"name": "Battery", "enabled": False},
            {"name": "Scanner", "enabled": False},
            {"name": "Security", "enabled": False},
            {"name": "MDM Compatibility", "enabled": False},
            {"name": "Known Issues", "enabled": False},
        ],
        "entries": entries,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(entries)} entries to {output}")


if __name__ == "__main__":
    main()
