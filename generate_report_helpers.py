import zipfile
import os
import sys
from xml.etree import ElementTree as ET

# Namespaces
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"

ET.register_namespace('w', W_NS)
ET.register_namespace('r', R_NS)
ET.register_namespace('a', A_NS)

def qn(tag):
    return f"{{{W_NS}}}{tag}"

def make_run(text, bold=False, italic=False, size_pt=12, font="Times New Roman", color=None):
    r = ET.Element(qn('r'))
    rPr = ET.SubElement(r, qn('rPr'))
    
    rFonts = ET.SubElement(rPr, qn('rFonts'))
    rFonts.attrib[qn('ascii')] = font
    rFonts.attrib[qn('hAnsi')] = font
    rFonts.attrib[qn('cs')] = font
    
    if bold:
        ET.SubElement(rPr, qn('b'))
    if italic:
        ET.SubElement(rPr, qn('i'))
    if size_pt:
        sz = ET.SubElement(rPr, qn('sz'))
        sz.attrib[qn('val')] = str(int(size_pt * 2))
        szCs = ET.SubElement(rPr, qn('szCs'))
        szCs.attrib[qn('val')] = str(int(size_pt * 2))
    if color:
        c = ET.SubElement(rPr, qn('color'))
        c.attrib[qn('val')] = color
        
    t = ET.SubElement(r, qn('t'))
    t.text = text
    if text.startswith(' ') or text.endswith(' '):
        t.attrib['{http://www.w3.org/XML/1998/namespace}space'] = 'preserve'
    return r

def make_para(text="", style=None, align="both", space_before_pt=0, space_after_pt=6, line_spacing=1.15, bold=False, italic=False, size_pt=12, font="Times New Roman", color=None, runs=None):
    p = ET.Element(qn('p'))
    pPr = ET.SubElement(p, qn('pPr'))
    
    if style:
        pStyle = ET.SubElement(pPr, qn('pStyle'))
        pStyle.attrib[qn('val')] = style
        
    if align:
        jc = ET.SubElement(pPr, qn('jc'))
        jc.attrib[qn('val')] = align
        
    spacing = ET.SubElement(pPr, qn('spacing'))
    if space_before_pt:
        spacing.attrib[qn('before')] = str(int(space_before_pt * 20))
    if space_after_pt:
        spacing.attrib[qn('after')] = str(int(space_after_pt * 20))
    if line_spacing:
        spacing.attrib[qn('line')] = str(int(line_spacing * 240))
        spacing.attrib[qn('lineRule')] = "auto"
        
    if runs:
        for r in runs:
            p.append(r)
    elif text:
        p.append(make_run(text, bold=bold, italic=italic, size_pt=size_pt, font=font, color=color))
        
    return p

def make_page_break():
    p = ET.Element(qn('p'))
    r = ET.SubElement(p, qn('r'))
    br = ET.SubElement(r, qn('br'))
    br.attrib[qn('type')] = "page"
    return p

def make_heading(text, level=1):
    if level == 1:
        # Centered Heading 1 with page break or prominent spacing
        return make_para(text, style="Heading1", align="center", space_before_pt=18, space_after_pt=12, bold=True, size_pt=16, font="Times New Roman", color="0F4761")
    elif level == 2:
        return make_para(text, style="Heading2", align="left", space_before_pt=14, space_after_pt=6, bold=True, size_pt=13.5, font="Times New Roman", color="0F4761")
    elif level == 3:
        return make_para(text, style="Heading3", align="left", space_before_pt=10, space_after_pt=4, bold=True, size_pt=12, font="Times New Roman", color="203764")

def make_bullet(text, bold_prefix=None):
    p = ET.Element(qn('p'))
    pPr = ET.SubElement(p, qn('pPr'))
    pStyle = ET.SubElement(pPr, qn('pStyle'))
    pStyle.attrib[qn('val')] = "ListBullet"
    spacing = ET.SubElement(pPr, qn('spacing'))
    spacing.attrib[qn('after')] = "60"
    ind = ET.SubElement(pPr, qn('ind'))
    ind.attrib[qn('left')] = "403"
    ind.attrib[qn('hanging')] = "202"
    
    if bold_prefix:
        p.append(make_run(bold_prefix, bold=True, size_pt=11.5, font="Times New Roman"))
    p.append(make_run(text, size_pt=11.5, font="Times New Roman"))
    return p

def make_table(headers, data, col_widths, alignments=None, font_size=10.5):
    tbl = ET.Element(qn('tbl'))
    
    # Table properties
    tblPr = ET.SubElement(tbl, qn('tblPr'))
    tblStyle = ET.SubElement(tblPr, qn('tblStyle'))
    tblStyle.attrib[qn('val')] = "TableGrid"
    tblW = ET.SubElement(tblPr, qn('tblW'))
    tblW.attrib[qn('w')] = "0"
    tblW.attrib[qn('type')] = "auto"
    jc = ET.SubElement(tblPr, qn('jc'))
    jc.attrib[qn('val')] = "center"
    tblLayout = ET.SubElement(tblPr, qn('tblLayout'))
    tblLayout.attrib[qn('type')] = "fixed"
    
    # Table grid
    tblGrid = ET.SubElement(tbl, qn('tblGrid'))
    for w in col_widths:
        col = ET.SubElement(tblGrid, qn('gridCol'))
        col.attrib[qn('w')] = str(w)
        
    num_cols = len(col_widths)
    if not alignments:
        alignments = ["left"] * num_cols
        
    # Header row
    if headers:
        tr = ET.SubElement(tbl, qn('tr'))
        trPr = ET.SubElement(tr, qn('trPr'))
        ET.SubElement(trPr, qn('tblHeader'))
        ET.SubElement(trPr, qn('cantSplit'))
        
        for idx, h_text in enumerate(headers):
            tc = ET.SubElement(tr, qn('tc'))
            tcPr = ET.SubElement(tc, qn('tcPr'))
            tcW = ET.SubElement(tcPr, qn('tcW'))
            tcW.attrib[qn('w')] = str(col_widths[idx])
            tcW.attrib[qn('type')] = "dxa"
            
            # Subtle grey background for header
            shd = ET.SubElement(tcPr, qn('shd'))
            shd.attrib[qn('val')] = "clear"
            shd.attrib[qn('color')] = "auto"
            shd.attrib[qn('fill')] = "EAECEE"
            
            tcMar = ET.SubElement(tcPr, qn('tcMar'))
            for m in ['top', 'bottom']:
                node = ET.SubElement(tcMar, qn(m))
                node.attrib[qn('w')] = "140"
                node.attrib[qn('type')] = "dxa"
            for m in ['left', 'right']:
                node = ET.SubElement(tcMar, qn(m))
                node.attrib[qn('w')] = "160"
                node.attrib[qn('type')] = "dxa"
                
            p = make_para(h_text, align=alignments[idx], space_before_pt=3, space_after_pt=3, bold=True, size_pt=font_size, color="0F4761")
            tc.append(p)
            
    # Data rows
    for r_idx, row in enumerate(data):
        tr = ET.SubElement(tbl, qn('tr'))
        trPr = ET.SubElement(tr, qn('trPr'))
        ET.SubElement(trPr, qn('cantSplit'))
        
        for c_idx, cell_value in enumerate(row):
            tc = ET.SubElement(tr, qn('tc'))
            tcPr = ET.SubElement(tc, qn('tcPr'))
            tcW = ET.SubElement(tcPr, qn('tcW'))
            tcW.attrib[qn('w')] = str(col_widths[c_idx])
            tcW.attrib[qn('type')] = "dxa"
            
            if r_idx % 2 == 1:
                shd = ET.SubElement(tcPr, qn('shd'))
                shd.attrib[qn('val')] = "clear"
                shd.attrib[qn('color')] = "auto"
                shd.attrib[qn('fill')] = "F9FAFB"
                
            tcMar = ET.SubElement(tcPr, qn('tcMar'))
            for m in ['top', 'bottom']:
                node = ET.SubElement(tcMar, qn(m))
                node.attrib[qn('w')] = "120"
                node.attrib[qn('type')] = "dxa"
            for m in ['left', 'right']:
                node = ET.SubElement(tcMar, qn(m))
                node.attrib[qn('w')] = "160"
                node.attrib[qn('type')] = "dxa"
                
            p = make_para(str(cell_value), align=alignments[c_idx], space_before_pt=2, space_after_pt=2, size_pt=font_size)
            tc.append(p)
            
    return tbl

def make_callout_box(title, text, width_dxa=9360):
    tbl = ET.Element(qn('tbl'))
    tblPr = ET.SubElement(tbl, qn('tblPr'))
    tblStyle = ET.SubElement(tblPr, qn('tblStyle'))
    tblStyle.attrib[qn('val')] = "TableGrid"
    tblW = ET.SubElement(tblPr, qn('tblW'))
    tblW.attrib[qn('w')] = str(width_dxa)
    tblW.attrib[qn('type')] = "dxa"
    jc = ET.SubElement(tblPr, qn('jc'))
    jc.attrib[qn('val')] = "center"
    
    tblGrid = ET.SubElement(tbl, qn('tblGrid'))
    col = ET.SubElement(tblGrid, qn('gridCol'))
    col.attrib[qn('w')] = str(width_dxa)
    
    tr = ET.SubElement(tbl, qn('tr'))
    tc = ET.SubElement(tr, qn('tc'))
    tcPr = ET.SubElement(tc, qn('tcPr'))
    tcW = ET.SubElement(tcPr, qn('tcW'))
    tcW.attrib[qn('w')] = str(width_dxa)
    tcW.attrib[qn('type')] = "dxa"
    
    # Left border only (accent callout)
    tcBorders = ET.SubElement(tcPr, qn('tcBorders'))
    left = ET.SubElement(tcBorders, qn('left'))
    left.attrib[qn('val')] = "single"
    left.attrib[qn('sz')] = "24"
    left.attrib[qn('space')] = "0"
    left.attrib[qn('color')] = "0F4761"
    
    for b in ['top', 'bottom', 'right']:
        nb = ET.SubElement(tcBorders, qn(b))
        nb.attrib[qn('val')] = "none"
        
    shd = ET.SubElement(tcPr, qn('shd'))
    shd.attrib[qn('val')] = "clear"
    shd.attrib[qn('color')] = "auto"
    shd.attrib[qn('fill')] = "F4F6F7"
    
    tcMar = ET.SubElement(tcPr, qn('tcMar'))
    for m in ['top', 'bottom']:
        node = ET.SubElement(tcMar, qn(m))
        node.attrib[qn('w')] = "140"
        node.attrib[qn('type')] = "dxa"
    for m in ['left', 'right']:
        node = ET.SubElement(tcMar, qn(m))
        node.attrib[qn('w')] = "220"
        node.attrib[qn('type')] = "dxa"
        
    p1 = make_para(title, bold=True, size_pt=11, color="0F4761", space_before_pt=2, space_after_pt=2)
    p2 = make_para(text, italic=True, size_pt=11, space_before_pt=2, space_after_pt=2)
    tc.append(p1)
    tc.append(p2)
    return tbl

print("Helper definitions successfully loaded.")
