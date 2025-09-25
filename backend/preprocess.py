import spacy
import pickle
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
import dill
import re
import string 

nlp = spacy.load('en_core_web_sm')
def tagged_dialogue(dialogue):
    tagged = [(token.text, token.pos_) for token in nlp(dialogue)]  # To get tag and dep labels, replace pos_ by tag_ and dep_. See spacy documentation for meanings.
    tagged_temp = [' '.join(j) for j in tagged]
    tagged_final = ' '.join(tagged_temp)
    return(tagged_final)

dictionary = { "ADJ":"adjective",
"ADP":"adposition",
"ADV":"adverb",
"AUX":"auxiliary",
"CONJ":"conjunction",
"CCONJ":"coordinating conjunction",
"DET":"determiner",
"INTJ":"interjection",
"NOUN":"noun",
"NUM":"numeral",
"PART":"particle",
"PRON":"pronoun",
"PROPN":"proper noun",
"PUNCT":"punctuation",
"SCONJ":"subordinating conjunction",
"SYM":"symbol",
"VERB":"verb",
"X":"other",
"SPACE":"space"}

def pos_complete(dialogue):
    address = dialogue
    for word, initial in dictionary.items():
        address = address.replace(word, initial)
    return(address)

def pos_text_complete(text):
  return pos_complete(tagged_dialogue(text))


with open(r'backend/vectorizer.pkl', 'rb') as f:
    vec = dill.load(f)

# Ensure tokenizer dependencies are available even if the dill-loaded function
# didn't capture globals correctly. Override tokenizer defensively.
def _safe_tokenize(text):
    import re as _re
    import string as _string
    pattern = _re.compile(f'([{_string.punctuation}“”¨«»®´·º½¾¿¡§£₤‘’])')
    return pattern.sub(r' \\1 ', text).split()

try:
    # Only set if attribute exists; scikit-learn will read it at transform time
    if hasattr(vec, 'tokenizer') and callable(getattr(vec, 'tokenizer', None)):
        vec.tokenizer = _safe_tokenize
except Exception:
    pass


def preprocess_text(text):
    pos_text = pos_text_complete(text)
    new_text_vec = vec.transform([pos_text])
    return new_text_vec

raw_text = "the boy is on a stool that is falling while he's trying to get some cookies out_of the cookie jar in the top shelf (.) of the cupboard .  the little girl is reaching for a cookie .  it looks like she's sort of laughing at the boy or putting her finger up to her mouth to be quiet so her mother doesn't hear who is in the kitchen drying dishes but the water in the sink is overflowing onto the floor and she's stepping in the water .  the window is open .  looks like &+s it's summer outside . [+ gram]  yeah there's trees with leaves .  is that all (.) you want me to do ? [+ exc]  she's [//] (.) doesn't look it's like she hears them .  she doesn't seem to be aware of them .  some of the dishes are already washed and dried .  is that all you want me to say ? [+ exc]"
pos_text = pos_text_complete(raw_text)