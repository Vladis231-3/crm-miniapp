---
name: docx-report
description: Read, analyze, compare, generate, or fix formatting of Word DOCX reports using python-docx + lxml. Handles paragraph/table structure, run-level formatting, and template matching.
---

# DOCX Report Workflow

Reusable playbook for working with Word (.docx) documents: reading structure, comparing formatting between files, generating new reports from templates, and fixing formatting mismatches.

## Prerequisites

```bash
pip install python-docx lxml
```

Always start Python scripts with encoding fix for Russian text:
```python
import sys
sys.stdout.reconfigure(encoding='utf-8')
```

## 1. Read & Analyze DOCX Structure

Extract paragraphs, tables, and their formatting from a DOCX file:

```python
from docx import Document
from lxml import etree

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
nsmap = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

doc = Document(filepath)

# Paragraphs with formatting
for i, p in enumerate(doc.paragraphs):
    if not p.text.strip():
        continue
    pf = p.paragraph_format
    print(f"P{i}: alignment={pf.alignment}, "
          f"first_indent={pf.first_line_indent}, "
          f"line_spacing={pf.line_spacing}, "
          f"space_before={pf.space_before}, "
          f"space_after={pf.space_after}")
    for run in p.runs:
        f = run.font
        print(f"  Run: '{run.text[:50]}' font={f.name} size={f.size} bold={f.bold} italic={f.italic}")

# Raw XML for paragraph properties (pPr) — essential for exact formatting matching
for i, p in enumerate(doc.paragraphs):
    pPr = p._element.find(f'{W}pPr')
    if pPr is not None:
        print(f"P{i} pPr XML: {etree.tostring(pPr, encoding='unicode')[:300]}")

# Tables
for ti, table in enumerate(doc.tables):
    print(f"Table {ti}: {len(table.rows)} rows x {len(table.columns)} cols")
    for ri, row in enumerate(table.rows):
        cells = [cell.text.strip()[:30] for cell in row.cells]
        print(f"  Row {ri}: {cells}")
```

## 2. Compare Formatting Between Two DOCX Files

When you have an example/template file and a target file that needs matching:

```python
from docx import Document
from lxml import etree
import re

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

def clean_xml(xml):
    """Normalize XML for comparison (strip namespaces, whitespace)."""
    xml = re.sub(r'xmlns:\w+="[^"]*"\s*', '', xml)
    xml = re.sub(r'<(/?)\w+:', r'<\1', xml)
    return xml

def get_pPr_text(doc):
    """Extract paragraph property signatures for comparison."""
    result = []
    for i, p in enumerate(doc.paragraphs):
        if not p.text.strip():
            continue
        pPr = p._element.find(f'{W}pPr')
        pPr_xml = etree.tostring(pPr, encoding='unicode') if pPr is not None else ""
        result.append((p.text.strip()[:80], clean_xml(pPr_xml)))
    return result

example = Document(example_path)
target = Document(target_path)

ex_sigs = get_pPr_text(example)
tg_sigs = get_pPr_text(target)

# Compare by matching paragraph text, then checking pPr differences
diffs = 0
for (ex_text, ex_xml), (tg_text, tg_xml) in zip(ex_sigs, tg_sigs):
    if ex_xml != tg_xml:
        diffs += 1
        print(f"DIFF: '{ex_text[:50]}'\n  Example pPr: {ex_xml[:200]}\n  Target pPr:  {tg_xml[:200]}\n")
```

## 3. Fix Formatting: Copy pPr from Example to Target

The most common task — make target paragraphs match example formatting at the XML level:

```python
from docx import Document
from lxml import etree
import copy

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

example = Document(example_path)
target = Document(target_path)

# Build lookup: normalized paragraph text -> list of example pPr elements
example_map = {}
for p in example.paragraphs:
    norm = ' '.join(p.text.split()).strip()[:80]
    if not norm:
        continue
    pPr = p._element.find(f'{W}pPr')
    if pPr is not None:
        example_map.setdefault(norm, []).append(copy.deepcopy(pPr))

# Apply formatting to target
fixed = 0
for p in target.paragraphs:
    norm = ' '.join(p.text.split()).strip()[:80]
    if not norm or norm not in example_map:
        continue
    candidates = example_map[norm]
    if not candidates:
        continue

    # Remove existing pPr
    old_pPr = p._element.find(f'{W}pPr')
    if old_pPr is not None:
        p._element.remove(old_pPr)

    # Insert example pPr
    new_pPr = copy.deepcopy(candidates[0])
    p._element.insert(0, new_pPr)
    fixed += 1

target.save(output_path)
print(f"Fixed {fixed} paragraphs")
```

## 4. Generate DOCX from Scratch

When creating new reports based on template structure:

```python
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

doc = Document()

# Set default font
style = doc.styles['Normal']
font = style.font
font.name = 'Times New Roman'
font.size = Pt(14)

# Add paragraph with specific formatting
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Title Text')
run.font.size = Pt(16)
run.font.bold = True

# Add table
table = doc.add_table(rows=5, cols=3)
table.style = 'Table Grid'
for ri, row in enumerate(table.rows):
    for ci, cell in enumerate(row.cells):
        cell.text = f'Cell {ri},{ci}'

doc.save(output_path)
```

## Key Patterns Observed

- **Encoding:** Always use `sys.stdout.reconfigure(encoding='utf-8')` for Russian text on Windows
- **PowerShell:** Use `;` not `&&` for command chaining; use `python script.py` not `python -c "..."` for complex scripts
- **pPr is king:** Most formatting differences between DOCX files live in the paragraph properties (`<w:pPr>`) XML element — font info can be at run level or paragraph level
- **Exact matching:** Match paragraphs by normalized text content, then compare/copy the pPr XML
- **Tables:** Use `table.rows[i].cells[j].text` for reading; formatting differences in tables are usually in cell-level `<w:tcPr>`
