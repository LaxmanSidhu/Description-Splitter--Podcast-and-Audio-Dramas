from flask import Flask, render_template, request, jsonify
import re
from itertools import islice
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None

app = Flask(__name__)

URL_RE = re.compile(r"http\S+|www\S+|https\S+")
EMAIL_RE = re.compile(r"\S+@\S+")
HTML_RE = re.compile(r"<.*?>")
EMOJI_RE = re.compile(r"[^\x00-\x7F]+")
MULTISPACE_RE = re.compile(r"\s+")

STOPWORDS = set([
    "the","and","is","in","it","of","to","a","an","for","on","with","that","this","these","those","s"
])

def clean_text(text):
    text = URL_RE.sub(" ", text)
    text = EMAIL_RE.sub(" ", text)
    text = HTML_RE.sub(" ", text)
    text = EMOJI_RE.sub(" ", text)
    text = MULTISPACE_RE.sub(" ", text)
    return text.strip()

def important_words_from_text(text, max_words=50):
    text = clean_text(text)
    if nlp:
        doc = nlp(text)
        words = [token.lemma_.lower() for token in doc if not token.is_stop and not token.is_punct and token.lemma_.isalpha() and token.lemma_.lower() not in STOPWORDS]
    else:
        # simple fallback: split and filter
        words = [w.lower() for w in re.findall(r"\w+", text) if w.lower() not in STOPWORDS and len(w)>2]
    # preserve order and dedupe
    seen = set()
    out = []
    for w in words:
        if w not in seen:
            out.append(w)
            seen.add(w)
        if len(out) >= max_words:
            break
    return out

def generate_ngrams(words, n=1, append_label=None, limit=50):
    if not words:
        return []
    res = []
    L = len(words)
    for i in range(L - n + 1):
        gram = " ".join(words[i:i+n])
        if append_label:
            res.append(f"{gram} {append_label}")
        else:
            res.append(gram)
    # also include single-word grams from words if n==1 (already)
    return list(islice(res, limit))

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/podcasts")
def podcasts():
    return render_template("podcasts.html", mode="podcasts")

@app.route("/audio-dramas")
def audio_dramas():
    return render_template("audio_dramas.html", mode="audio dramas")

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json or {}
    text = data.get("text", "")
    option = data.get("option", "")  # e.g., '1word', '2word_podcasts', '3word_audio'
    mode = data.get("mode", "")  # 'podcasts' or 'audio dramas'
    words = important_words_from_text(text, max_words=50)

    append_label = None
    if option.endswith("_podcasts"):
        append_label = "podcasts"
    elif option.endswith("_audio"):
        append_label = "audio dramas"
    # determine n
    if option.startswith("1word"):
        n = 1
    elif option.startswith("2word"):
        n = 2
    elif option.startswith("3word"):
        n = 3
    else:
        n = 1

    results = generate_ngrams(words, n=n, append_label=append_label)
    return jsonify({"result": results})

@app.route("/ai_suggestions", methods=["POST"])
def ai_suggestions():
    data = request.json or {}
    text = data.get("text", "")
    mode = data.get("mode","podcasts")
    words = important_words_from_text(text, max_words=20)
    suggestions = []
    # create a few heuristic suggestions mixing top words
    for n in (1,2,3):
        grams = generate_ngrams(words, n=n, append_label=mode)
        for g in grams:
            if g not in suggestions:
                suggestions.append(g)
            if len(suggestions) >= 12:
                break
        if len(suggestions) >= 12:
            break
    # if still few, add some single words plain
    if len(suggestions) < 6:
        for w in words[:6]:
            suggestions.append(f"{w} {mode}")
    return jsonify({"suggestions": suggestions})

if __name__ == "__main__":
    app.run(debug=True)
