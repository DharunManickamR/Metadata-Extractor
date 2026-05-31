import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_forensic_report(metadata, output_path):
    """
    Generates a professional, legally structured PDF forensic report.
    Wraps long values in Paragraphs to ensure clean text wrapping inside tables.
    
    Args:
        metadata (dict): The complete metadata dictionary extracted from the file.
        output_path (str): File path to save the generated PDF.
        
    Returns:
        bool: True if successful, False otherwise.
    """
    try:
        # Ensure directories exist
        dir_name = os.path.dirname(output_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        
        # Setup document margins
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )
        
        styles = getSampleStyleSheet()
        
        # Define Custom Professional Styles
        title_style = ParagraphStyle(
            name='ForensicTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0F172A'), # Slate 900
            alignment=0, # Left-aligned
            spaceAfter=6
        )
        
        subtitle_style = ParagraphStyle(
            name='ForensicSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#64748B'), # Slate 500
            spaceAfter=20
        )
        
        section_style = ParagraphStyle(
            name='ForensicSection',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1E3A8A'), # Deep blue
            spaceBefore=15,
            spaceAfter=8,
            keepWithNext=True
        )
        
        body_style = ParagraphStyle(
            name='ForensicBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor('#334155') # Slate 700
        )
        
        body_bold = ParagraphStyle(
            name='ForensicBodyBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )
        
        hash_label_style = ParagraphStyle(
            name='HashLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#991B1B') # Red 800 for forensic integrity
        )
        
        hash_value_style = ParagraphStyle(
            name='HashValue',
            parent=styles['Normal'],
            fontName='Courier-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#111827')
        )
        
        meta_label_style = ParagraphStyle(
            name='MetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1E293B')
        )
        
        meta_value_style = ParagraphStyle(
            name='MetaValue',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )
        
        declaration_style = ParagraphStyle(
            name='ForensicDeclaration',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor('#475569'),
            alignment=1, # Centered
            spaceBefore=20
        )

        story = []
        
        # 1. Header Banner
        story.append(Paragraph("DIGITAL FORENSICS INVESTIGATION", title_style))
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        story.append(Paragraph(f"FORENSIC METADATA EXTRACTION REPORT &bull; GENERATED ON: {current_time}", subtitle_style))
        story.append(Spacer(1, 10))
        
        # 2. File Integrity Block (MD5 / SHA-256)
        story.append(Paragraph("CRITICAL FILE INTEGRITY SIGNATURES", section_style))
        
        hashes = metadata.get("hashes", {})
        md5_val = hashes.get("md5", "N/A")
        sha256_val = hashes.get("sha256", "N/A")
        
        hash_data = [
            [Paragraph("MD5 Hash Signature", hash_label_style), Paragraph(md5_val, hash_value_style)],
            [Paragraph("SHA-256 Hash Signature", hash_label_style), Paragraph(sha256_val, hash_value_style)]
        ]
        
        hash_table = Table(hash_data, colWidths=[130, 374])
        hash_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF2F2')), # Soft red tint
            ('BORDER', (0,0), (-1,-1), 1.5, colors.HexColor('#F87171')),  # Red border
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#FCA5A5'))
        ]))
        story.append(hash_table)
        story.append(Spacer(1, 15))
        
        # 3. General File Details
        story.append(Paragraph("GENERAL FILE INFORMATION", section_style))
        
        gen = metadata.get("general", {})
        gen_data = [
            [Paragraph("Filename", meta_label_style), Paragraph(gen.get("filename", "N/A"), meta_value_style)],
            [Paragraph("File Category", meta_label_style), Paragraph(gen.get("category", "N/A").upper(), meta_value_style)],
            [Paragraph("MIME File Type", meta_label_style), Paragraph(gen.get("mime_type", "N/A"), meta_value_style)],
            [Paragraph("File Size", meta_label_style), Paragraph(f"{gen.get('size_bytes', 0)} Bytes ({gen.get('size_formatted', 'N/A')})", meta_value_style)],
            [Paragraph("System Birth Time (ctime)", meta_label_style), Paragraph(gen.get("created", "N/A"), meta_value_style)],
            [Paragraph("System Modification Time (mtime)", meta_label_style), Paragraph(gen.get("modified", "N/A"), meta_value_style)],
            [Paragraph("Physical File Storage Location", meta_label_style), Paragraph(gen.get("filepath", "N/A"), meta_value_style)]
        ]
        
        gen_table = Table(gen_data, colWidths=[150, 354])
        gen_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F1F5F9')), # Slate 100
            ('BORDER', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0'))
        ]))
        story.append(gen_table)
        story.append(Spacer(1, 15))
        
        # 4. Format-Specific Extracted Metadata
        specific = metadata.get("specific", {})
        if specific and not (len(specific) == 1 and "Message" in specific):
            story.append(Paragraph("SPECIFIC EMBEDDED METADATA ANALYSIS", section_style))
            
            spec_data = []
            for k, v in specific.items():
                if k == "Google Maps Link":
                    # Style maps link beautifully
                    link_html = f'<font color="#1E3A8A"><u><a href="{v}">Open Location in Google Maps</a></u></font>'
                    spec_data.append([Paragraph(k, meta_label_style), Paragraph(link_html, meta_value_style)])
                else:
                    spec_data.append([Paragraph(k, meta_label_style), Paragraph(str(v), meta_value_style)])
                    
            spec_table = Table(spec_data, colWidths=[150, 354])
            spec_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')), # Slate 50
                ('BORDER', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('RIGHTPADDING', (0,0), (-1,-1), 10),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9'))
            ]))
            story.append(spec_table)
            story.append(Spacer(1, 15))
            
        # 5. Forensic Chain of Custody Declaration & Authenticity Seal
        declaration_text = (
            "FORENSIC INTEGRITY STATEMENT &bull; "
            "This document constitutes a digital forensic record automatically compiled by the Antigravity "
            "Digital Forensics Metadata Extractor. The cryptographic MD5 and SHA-256 hash checksums recorded "
            "above reflect a exact block-by-block representation of the file at the precise moment of extraction. "
            "Any post-extraction modification or tampering with the target file will result in completely "
            "different hash signatures, invalidating the forensic chain of custody."
        )
        
        story.append(Spacer(1, 20))
        story.append(KeepTogether([
            Table([["FORENSIC INTEGRITY DECLARATION"]], colWidths=[504],
                  style=[
                      ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0F172A')), # Dark charcoal
                      ('TEXTCOLOR', (0,0), (-1,-1), colors.white),
                      ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                      ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
                      ('FONTSIZE', (0,0), (-1,-1), 9),
                      ('TOPPADDING', (0,0), (-1,-1), 6),
                      ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                  ]),
            Table([[Paragraph(declaration_text, declaration_style)]], colWidths=[504],
                  style=[
                      ('BORDER', (0,0), (-1,-1), 1, colors.HexColor('#0F172A')),
                      ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
                      ('TOPPADDING', (0,0), (-1,-1), 10),
                      ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                      ('LEFTPADDING', (0,0), (-1,-1), 15),
                      ('RIGHTPADDING', (0,0), (-1,-1), 15),
                  ])
        ]))
        
        # Build document
        doc.build(story)
        return True
    except Exception as e:
        print(f"Error generating forensic PDF: {str(e)}")
        return False
