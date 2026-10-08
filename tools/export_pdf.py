import os
import subprocess
import sys
from pathlib import Path

def export_single_pdf(md_filename, pdf_filename, title):
    base_dir = Path(__file__).resolve().parent.parent
    md_file = base_dir / md_filename
    html_file = base_dir / (Path(pdf_filename).stem + ".html")
    pdf_file = base_dir / pdf_filename

    if not md_file.exists():
        print(f"Error: {md_file} not found")
        return False

    print(f"\n--- Converting {md_file.name} to {pdf_filename} ---")
    pandoc_cmd = ["pandoc", str(md_file), "-t", "html", "--mathjax"]
    res = subprocess.run(pandoc_cmd, capture_output=True, text=True, check=True, encoding="utf-8")
    body_html = res.stdout

    # Academic styling template
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RoutePilot — Academic Project Report</title>
<style>
  @page {{
    size: A4;
    margin: 22mm 18mm 22mm 18mm;
    @bottom-center {{
      content: counter(page);
      font-family: 'Times New Roman', serif;
      font-size: 10pt;
      color: #64748b;
    }}
  }}

  body {{
    font-family: 'Times New Roman', 'Georgia', serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #111827;
    background: #ffffff;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  /* Headings */
  h1, h2, h3, h4, h5, h6 {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f2d59;
    font-weight: 700;
  }}

  h1 {{
    font-size: 17pt;
    border-bottom: 2.5px solid #0f2d59;
    padding-bottom: 6px;
    margin-top: 26px;
    margin-bottom: 14px;
    page-break-before: always;
    break-before: page;
    letter-spacing: -0.2px;
  }}

  /* Do not page-break before the first document title */
  h1:first-of-type {{
    page-break-before: avoid;
    break-before: avoid;
    text-align: center;
    border-bottom: none;
    font-size: 21pt;
    margin-top: 40px;
    margin-bottom: 12px;
  }}

  h2 {{
    font-size: 13.5pt;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
    margin-top: 20px;
    margin-bottom: 10px;
    break-after: avoid;
    page-break-after: avoid;
  }}

  h3 {{
    font-size: 11.5pt;
    margin-top: 16px;
    margin-bottom: 6px;
    break-after: avoid;
    page-break-after: avoid;
  }}

  p {{
    text-align: justify;
    text-justify: inter-word;
    margin-top: 0;
    margin-bottom: 10px;
  }}

  /* Tables */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }}

  th, td {{
    border: 1px solid #94a3b8;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }}

  th {{
    background-color: #f1f5f9;
    font-weight: 700;
    color: #0f2d59;
  }}

  tr:nth-child(even) td {{
    background-color: #f8fafc;
  }}

  /* Code & Pre */
  pre, code {{
    font-family: 'Consolas', 'Courier New', monospace;
  }}

  pre {{
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 10px 12px;
    font-size: 8.5pt;
    line-height: 1.45;
    page-break-inside: avoid;
    break-inside: avoid;
    white-space: pre-wrap;
    word-break: break-word;
  }}

  code {{
    background-color: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 9.5pt;
    color: #0f2d59;
  }}

  pre code {{
    background: transparent;
    padding: 0;
    color: inherit;
  }}

  /* Callouts & Quotes */
  blockquote {{
    border-left: 4px solid #0f2d59;
    margin: 14px 0;
    padding: 8px 16px;
    background-color: #f8fafc;
    color: #334155;
    font-style: italic;
  }}

  hr {{
    border: 0;
    height: 1px;
    background: #cbd5e1;
    margin: 22px 0;
  }}

  ul, ol {{
    margin-top: 0;
    margin-bottom: 12px;
    padding-left: 22px;
  }}

  li {{
    margin-bottom: 5px;
  }}

  /* Academic Signatures & Structure */
  .center {{
    text-align: center;
  }}

  .signature-box {{
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
  }}
</style>
</head>
<body>
{body_html}
</body>
</html>
"""

    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Saved styled HTML to {html_file.name}")

    # Render via Edge headless
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    ]
    browser_exe = None
    for p in edge_paths:
        if os.path.exists(p):
            browser_exe = p
            break

    if not browser_exe:
        print("Error: No Chromium-based browser found for PDF export.")
        return False

    print(f"Rendering PDF with: {browser_exe}")
    cmd = [
        browser_exe,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={str(pdf_file)}",
        str(html_file)
    ]
    subprocess.run(cmd, check=True)

    if pdf_file.exists():
        size_kb = pdf_file.stat().st_size / 1024
        print(f"SUCCESS: Generated {pdf_file.name} ({size_kb:.1f} KB)")
        return True
    else:
        print("PDF generation failed: output file not found.")
        return False

def main():
    export_single_pdf(
        "ACADEMIC_PROJECT_REPORT.md",
        "RoutePilot_Academic_Project_Report.pdf",
        "RoutePilot — Academic Project Report"
    )
    export_single_pdf(
        "PROJECT_REPORT.md",
        "RoutePilot_Technical_Audit_Report.pdf",
        "RoutePilot — Technical & Operational Audit Report"
    )

if __name__ == "__main__":
    main()
