import json

def generate():
    with open('extracted_text.txt', 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
    
    # Find start
    start_idx = 0
    for i, line in enumerate(lines):
        if line == '?':
            start_idx = i + 1
            break
            
    words = []
    for i in range(start_idx, len(lines)):
        if lines[i] == 'THỨ TỰ 2':
            break
        words.append(lines[i])
        
    # We have the English words. Let's save them as a JSON list.
    with open('english_words.json', 'w', encoding='utf-8') as f:
        json.dump(words, f, indent=2)

if __name__ == '__main__':
    generate()
