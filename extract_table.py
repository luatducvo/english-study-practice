import docx
import json

def extract_vocab(file_path):
    doc = docx.Document(file_path)
    vocab_list = []
    
    for table in doc.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            if len(cells) >= 4:
                word = cells[1]
                ipa = cells[2]
                meaning = cells[3]
                if word and meaning and word.lower() != 'từ':
                    vocab_list.append({"word": word, "ipa": ipa, "meaning": meaning})
            elif len(cells) >= 2:
                word = cells[0]
                meaning = cells[1]
                if word and meaning and word.lower() != 'từ':
                    vocab_list.append({"word": word, "ipa": "", "meaning": meaning})

    # Save to a json file
    with open(r"d:\GIT\english_practice\vocab.json", 'w', encoding='utf-8') as f:
        json.dump(vocab_list, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    extract_vocab(r"d:\GIT\english_practice\TỔNG-HỢP-8-CHƯƠNG-ĐẦU.docx")
