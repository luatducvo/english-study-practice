import json

def build_data():
    with open('vocab_with_meaning.json', 'r', encoding='utf-8') as f:
        data = f.read()
        
    js_content = f"window.vocabData = {data};"
    
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
        
if __name__ == '__main__':
    build_data()
