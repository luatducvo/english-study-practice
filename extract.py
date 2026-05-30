import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as docx:
            tree = ET.fromstring(docx.read('word/document.xml'))
        
        namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        text = []
        for paragraph in tree.findall('.//w:p', namespaces):
            para_text = ''.join([node.text for node in paragraph.findall('.//w:t', namespaces) if node.text])
            if para_text.strip():
                text.append(para_text.strip())
        return '\n'.join(text)
    except Exception as e:
        return str(e)

content = read_docx(r"d:\GIT\english_practice\TỔNG-HỢP-8-CHƯƠNG-ĐẦU.docx")
with open(r"d:\GIT\english_practice\extracted_text.txt", "w", encoding="utf-8") as f:
    f.write(content)
print("Extracted to extracted_text.txt")
