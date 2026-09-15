"""Render the September Nourally audit; documentation artifacts only."""
from pathlib import Path
import html
import re
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Image, KeepTogether,
)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'AUDIT'
PDF = OUT / 'Nourally-App-Audit-2026-09-14.pdf'
PDF.parent.mkdir(parents=True, exist_ok=True)
SHOTS = OUT / 'evidence'
TEXT = (OUT / 'Nourally-App-Audit-2026-09-14.md').read_text()

for name, filename in [
    ('Audit', 'Arial.ttf'), ('Audit-Bold', 'Arial Bold.ttf'),
    ('Audit-Italic', 'Arial Italic.ttf'), ('Audit-BoldItalic', 'Arial Bold Italic.ttf'),
]:
    pdfmetrics.registerFont(TTFont(name, '/System/Library/Fonts/Supplemental/' + filename))
pdfmetrics.registerFontFamily('Audit', normal='Audit', bold='Audit-Bold', italic='Audit-Italic', boldItalic='Audit-BoldItalic')

INK = colors.HexColor('#12313C')
TEAL = colors.HexColor('#0D7F85')
LIME = colors.HexColor('#D7F45F')
MUTED = colors.HexColor('#53666E')
LINE = colors.HexColor('#D8E3E3')
PAPER = colors.HexColor('#F5F8F7')
WIDTH = 516

STYLES = {
    'body': ParagraphStyle('Body', fontName='Audit', fontSize=10.4, leading=15.1, textColor=INK, spaceAfter=9, splitLongWords=True),
    'h2': ParagraphStyle('Chapter', fontName='Audit-Bold', fontSize=23, leading=27, textColor=INK, spaceAfter=18, keepWithNext=True),
    'h3': ParagraphStyle('Subhead', fontName='Audit-Bold', fontSize=12.2, leading=16, textColor=TEAL, spaceBefore=9, spaceAfter=7, keepWithNext=True),
    'bullet': ParagraphStyle('Bullet', fontName='Audit', fontSize=10.4, leading=15.1, textColor=INK, leftIndent=13, firstLineIndent=-10, spaceAfter=6),
    'table': ParagraphStyle('Cell', fontName='Audit', fontSize=8.8, leading=12, textColor=INK, spaceAfter=0),
    'th': ParagraphStyle('HeadCell', fontName='Audit-Bold', fontSize=8.8, leading=12, textColor=colors.white),
    'dense': ParagraphStyle('DenseCell', fontName='Audit', fontSize=8.4, leading=10.8, textColor=INK),
    'dense_th': ParagraphStyle('DenseHeadCell', fontName='Audit-Bold', fontSize=8.4, leading=10.8, textColor=colors.white),
    'caption': ParagraphStyle('Caption', fontName='Audit', fontSize=9.2, leading=13.3, textColor=MUTED, spaceBefore=9, spaceAfter=10),
    'cover': ParagraphStyle('Cover', fontName='Audit-Bold', fontSize=39, leading=44, textColor=INK, spaceAfter=20),
    'deck': ParagraphStyle('Deck', fontName='Audit', fontSize=16, leading=23, textColor=MUTED, spaceAfter=18),
    'kicker': ParagraphStyle('Kicker', fontName='Audit-Bold', fontSize=10, leading=15, textColor=TEAL, spaceAfter=18),
}

def normalize(value):
    return value.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', ' - ').replace('\u00a0', ' ').replace('->', ' → ')

def markup(value):
    value = normalize(value)
    links = []
    def link(match):
        label, url = match.groups()
        links.append(f'<link href="{html.escape(url, quote=True)}" color="#0D7F85"><u>{html.escape(label)}</u></link>')
        return f'ZZLINK{len(links)-1}ZZ'
    value = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', link, value)
    value = html.escape(value)
    value = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', value)
    value = re.sub(r'`([^`]+)`', r'<font color="#30545B">\1</font>', value)
    for idx, val in enumerate(links):
        value = value.replace(f'ZZLINK{idx}ZZ', val)
    return value

class AuditDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(str(filename), pagesize=letter, leftMargin=48, rightMargin=48, topMargin=53, bottomMargin=49,
                         title='Nourally: Hands-on App Audit - September 14, 2026', author='Codex', pageCompression=1)
        self.addPageTemplates(PageTemplate(id='Audit', frames=[Frame(48,49,516,690, leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)], onPage=self.decorate))
    def decorate(self, canvas, doc):
        canvas.saveState()
        if doc.page > 1:
            canvas.setStrokeColor(LINE); canvas.line(48, 757, 564, 757)
            canvas.setFont('Audit-Bold',8); canvas.setFillColor(TEAL)
            canvas.drawString(48,768,'NOURALLY / HANDS-ON APP AUDIT')
            canvas.setFont('Audit',8); canvas.setFillColor(MUTED)
            canvas.drawRightString(564,768,'SEPTEMBER 14, 2026')
        canvas.setStrokeColor(LINE); canvas.line(48,36,564,36)
        canvas.setFont('Audit',8); canvas.setFillColor(MUTED)
        canvas.drawString(48,23,'Local build reviewed / findings and proposals, not implementation')
        canvas.drawRightString(564,23,str(doc.page))
        canvas.restoreState()
    def afterFlowable(self, flowable):
        if getattr(flowable,'audit_heading',False):
            title = flowable.getPlainText()
            key = 'section-' + re.sub(r'[^a-zA-Z0-9]+','-',title)
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(title,key,0,False)
            self.notify('TOCEntry',(0,title,self.page,key))

story = [Spacer(1,44), Paragraph('PRODUCT QUALITY / UX / TECHNICAL ROADMAP',STYLES['kicker']),
         Paragraph('Nourally.<br/>A complete<br/>hands-on review.', STYLES['cover']),
         Paragraph('What works. What breaks.<br/>How to make the app clearer, faster,<br/>and more polished.', STYLES['deck']), Spacer(1,24)]
summary = [
    ['23 prioritized findings','4 viewport widths'],
    ['6 primary destinations','Live USDA + barcode lookups'],
]
cover_table = Table([[Paragraph(x,STYLES['h3']) for x in row] for row in summary], colWidths=[258,258])
cover_table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PAPER),('BOX',(0,0),(-1,-1),.6,LINE),('LEFTPADDING',(0,0),(-1,-1),16),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]))
story += [cover_table, Spacer(1,25), Paragraph('September 14, 2026',STYLES['kicker']),
          Paragraph('Includes reproduced bugs, screen-by-screen recommendations, a connected-food data model, an ordered implementation backlog, test coverage, and visual evidence. No app features changed during this audit.',STYLES['body']),PageBreak()]
story.append(Paragraph('Contents',STYLES['h2']))
toc=TableOfContents()
toc.levelStyles=[ParagraphStyle('TOC',fontName='Audit',fontSize=9.5,leading=12.5,textColor=INK,spaceBefore=6,leftIndent=0,firstLineIndent=0,rightIndent=26)]
toc.tableStyle=TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)])
story.extend([toc,PageBreak()])

lines=TEXT.splitlines(); i=0; first_chapter=True
while i < len(lines):
    line=lines[i].strip()
    if not line or line.startswith('# '): i+=1; continue
    if line.startswith('## '):
        if not first_chapter: story.append(PageBreak())
        first_chapter=False
        h=Paragraph(markup(line[3:]),STYLES['h2']);h.audit_heading=True;story.append(h);i+=1;continue
    if line.startswith('### '): story.append(Paragraph(markup(line[4:]),STYLES['h3']));i+=1;continue
    if line.startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].strip().startswith('|'):
            cells=[x.strip() for x in lines[i].strip().strip('|').split('|')]
            if not all(re.fullmatch(r'[-: ]+',x) for x in cells): rows.append(cells)
            i+=1
        n=len(rows[0])
        widths={3:[100,257,159],4:[36,55,280,145]}.get(n,[WIDTH/n]*n)
        if rows[0][0] in ['Element','Record']: widths=[101,230,185]
        dense = len(rows)>15
        data=[[Paragraph(markup(cell),STYLES[('dense_th' if ri==0 else 'dense') if dense else ('th' if ri==0 else 'table')]) for cell in row] for ri,row in enumerate(rows)]
        table=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),INK),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PAPER]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),2.8 if dense else 7),('BOTTOMPADDING',(0,0),(-1,-1),2.8 if dense else 7),('LINEBELOW',(0,0),(-1,0),1,TEAL),('LINEBELOW',(0,1),(-1,-1),.35,LINE)]))
        story.extend([table,Spacer(1,10)]);continue
    if line.startswith('- ') or re.match(r'^\d+\. ',line):
        content=('•  '+line[2:]) if line.startswith('- ') else line
        story.append(Paragraph(markup(content),STYLES['bullet']));i+=1;continue
    paragraph=[line];i+=1
    while i<len(lines) and lines[i].strip() and not re.match(r'^(#|\||- |\d+\. )',lines[i].strip()):
        paragraph.append(lines[i].strip());i+=1
    story.append(Paragraph(markup(' '.join(paragraph)),STYLES['body']))

def shot(name,maxw,maxh):
    path=SHOTS/name
    w,h=PILImage.open(path).size
    scale=min(maxw/w,maxh/h)
    return Image(str(path),width=w*scale,height=h*scale)

plates=[
    ('Visual A / Today at an intermediate width',
     [('1024-today.png',516,505)],
     'The action card and timeline are separated correctly in this tested layout. The dominant hero is clear, but large introductory typography and very small operational labels reduce the amount of useful information visible at once. Preserve the gap while improving hierarchy.'),
    ('Visual B / Mobile Food: the selected task is buried',
     [('08-food-mobile-top.png',247,515),('09-food-mobile-log.png',247,515)],
     'Left: the top of the Food workspace. Right: the food-log content after moving far down the document in the populated search state. The same search results remain above the selected subsection. This is the highest-impact navigation change recommended in the report.'),
    ('Visual C / Mobile calendar and weekly summary',
     [('390-schedule.png',247,515),('390-weekly.png',247,515)],
     'The calendar fits but its event text is extremely small. The weekly page spends most of its first viewport on the introduction and summary cards. Prefer a mobile agenda and a more compact summary; keep detailed views available.'),
    ('Visual D / Mobile Today and Profile',
     [('390-today.png',247,515),('390-profile.png',247,515)],
     'Repeated editorial introductions consume valuable mobile space across different destinations. Use a consistent, compact application header and save the large brand expression for onboarding. No new imagery is required.'),
]
for title, images, caption in plates:
    story.append(PageBreak()); h=Paragraph(title,STYLES['h2']);h.audit_heading=True;story.append(h)
    pics=[shot(*args) for args in images]
    if len(pics)==1: story.append(pics[0])
    else:
        t=Table([pics],colWidths=[258,258]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),11)]));story.append(t)
    story.append(Paragraph(caption,STYLES['caption']))

AuditDoc(PDF).multiBuild(story)
print(PDF)
