"""Create contact sheets of the already-rendered PDF for visual QA."""
from pathlib import Path
from PIL import Image, ImageDraw
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
folder = root / 'tmp/pdfs/nourally-audit'
pages = sorted(folder.glob('verified-*.png'))
reader = PdfReader(root / 'AUDIT/Nourally-App-Audit-2026-09-14.pdf')
assert len(pages) == len(reader.pages) == 34
for start in range(0, len(pages), 6):
    sheet = Image.new('RGB', (1040, 2070), '#d9e2e2')
    draw = ImageDraw.Draw(sheet)
    for j, path in enumerate(pages[start:start+6]):
        page = Image.open(path).convert('RGB')
        page.thumbnail((500, 650))
        x = 10 + (j % 2) * 520
        y = 25 + (j // 2) * 690
        sheet.paste(page, (x, y))
        draw.text((x, y-17), f'PDF PAGE {start+j+1}', fill='#12313c')
    sheet.save(folder / f'contact-{start//6+1}.png')

for number, page in enumerate(reader.pages, 1):
    text = page.extract_text()
    assert text.strip(), f'Empty page {number}'
    assert '\ufffd' not in text, f'Replacement glyph on page {number}'
print(f'Checked {len(reader.pages)} nonempty pages; 6 contact sheets ready.')
