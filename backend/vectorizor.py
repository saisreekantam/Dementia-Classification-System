import pandas as pd
import spacy
import numpy as np
import glob
import  re
import sklearn
from sklearn.utils import shuffle
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics import roc_auc_score
from sklearn.metrics import classification_report
from sklearn.metrics import confusion_matrix
from sklearn import metrics
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.svm import SVC
from matplotlib import pyplot as plt
import re, string
from sklearn.linear_model import LogisticRegression
import pickle
import sys
import dill


df = pd.read_csv('backend\cookie_tagged.csv', sep = ';')
df['control'] = df.apply(lambda x: 1 if x['label'] == 0 else 0, axis = 1 )
df['dementia'] = df.apply(lambda x: 1 if x['label'] == 1 else 0, axis = 1 )

def tokenize(s):
  re_tok = re.compile(f'([{string.punctuation}“”¨«»®´·º½¾¿¡§£₤‘’])')
  return re_tok.sub(r' \1 ', s).split()

TEXT = 'pos_text_complete'
train, test = train_test_split(df, test_size=0.2, random_state=42)

text = df['pos_text_complete'][0]


def docs_for_column(column):
    n = train.shape[0]
    vec = TfidfVectorizer(ngram_range=(1,2), tokenizer=tokenize,
               min_df=3, max_df=0.9, strip_accents='unicode', use_idf=1,
               smooth_idf=1, sublinear_tf=1 )
    trn_term_doc = vec.fit_transform(train[column])
    test_term_doc = vec.transform(test[column])
    with open('vectorizer.pkl', 'wb') as f:
      dill.dump(vec, f)
      print(vec.transform([text]))
      print(vec)
    return trn_term_doc, test_term_doc

trn_term_doc, test_term_doc = docs_for_column(TEXT)
