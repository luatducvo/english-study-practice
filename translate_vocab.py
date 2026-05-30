import json
import urllib.request
import urllib.parse
import time

def translate(word):
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q={urllib.parse.quote(word)}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result[0][0][0].lower()
    except Exception as e:
        print(f"Error translating {word}: {e}")
        return ""

def main():
    with open('english_words.json', 'r', encoding='utf-8') as f:
        words = json.load(f)
        
    vocab = []
    for i, word in enumerate(words):
        meaning = translate(word)
        vocab.append({"word": word, "meaning": meaning})
        if (i+1) % 50 == 0:
            print(f"Translated {i+1}/{len(words)}")
        time.sleep(0.1) # Be nice to the API
        
    with open('vocab_with_meaning.json', 'w', encoding='utf-8') as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)
    print("Done!")

if __name__ == '__main__':
    main()
