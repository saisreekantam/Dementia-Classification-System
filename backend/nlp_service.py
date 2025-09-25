import pickle
import dill
import spacy
import re
import string
import time
from typing import Dict, Any, Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class NLPService:
    """Service class for NLP-based Alzheimer's/dementia detection"""
    
    def __init__(self):
        self.model_control = None
        self.weights_control = None
        self.model_alz = None
        self.weights_alz = None
        self.vectorizer = None
        self.nlp = None
        self.models_loaded = False
        
        # POS tag dictionary for expansion
        self.pos_dictionary = {
            "ADJ": "adjective",
            "ADP": "adposition",
            "ADV": "adverb",
            "AUX": "auxiliary",
            "CONJ": "conjunction",
            "CCONJ": "coordinating conjunction",
            "DET": "determiner",
            "INTJ": "interjection",
            "NOUN": "noun",
            "NUM": "numeral",
            "PART": "particle",
            "PRON": "pronoun",
            "PROPN": "proper noun",
            "PUNCT": "punctuation",
            "SCONJ": "subordinating conjunction",
            "SYM": "symbol",
            "VERB": "verb",
            "X": "other",
            "SPACE": "space"
        }
    
    def load_models(self):
        """Load all required models and dependencies"""
        try:
            # Load spaCy model
            logger.info("Loading spaCy model...")
            self.nlp = spacy.load('en_core_web_sm')
            
            # Load ML models
            logger.info("Loading control model...")
            with open('model_control.pkl', 'rb') as f:
                self.model_control, self.weights_control = pickle.load(f)
            
            logger.info("Loading Alzheimer's model...")
            with open('model_alz.pkl', 'rb') as f:
                self.model_alz, self.weights_alz = pickle.load(f)
            
            logger.info("Loading vectorizer...")
            with open('vectorizer.pkl', 'rb') as f:
                self.vectorizer = dill.load(f)
            
            # Fix tokenizer if needed (from your existing code)
            self._fix_vectorizer_tokenizer()
            
            self.models_loaded = True
            logger.info("All NLP models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise e
    
    def _fix_vectorizer_tokenizer(self):
        """Fix vectorizer tokenizer as in your original code"""
        def _safe_tokenize(text):
            pattern = re.compile(f'([{string.punctuation}""¨«»®´·º½¾¿¡§£₤''])')
            return pattern.sub(r' \\1 ', text).split()
        
        try:
            if hasattr(self.vectorizer, 'tokenizer') and callable(getattr(self.vectorizer, 'tokenizer', None)):
                self.vectorizer.tokenizer = _safe_tokenize
        except Exception as e:
            logger.warning(f"Could not fix vectorizer tokenizer: {str(e)}")
    
    def _tagged_dialogue(self, dialogue: str) -> str:
        """Extract POS tags from dialogue using spaCy"""
        if not self.nlp:
            raise RuntimeError("spaCy model not loaded")
        
        doc = self.nlp(dialogue)
        tagged = [(token.text, token.pos_) for token in doc]
        tagged_temp = [' '.join(j) for j in tagged]
        tagged_final = ' '.join(tagged_temp)
        return tagged_final
    
    def _pos_complete(self, dialogue: str) -> str:
        """Replace POS tags with their full names"""
        address = dialogue
        for word, initial in self.pos_dictionary.items():
            address = address.replace(word, initial)
        return address
    
    def _pos_text_complete(self, text: str) -> str:
        """Complete POS processing pipeline"""
        return self._pos_complete(self._tagged_dialogue(text))
    
    def _extract_linguistic_features(self, text: str, preprocessed_text: str) -> Dict[str, Any]:
        """Extract linguistic features from text"""
        try:
            doc = self.nlp(text)
            
            # Basic counts
            word_count = len([token for token in doc if not token.is_space and not token.is_punct])
            sentence_count = len(list(doc.sents))
            
            # Calculate average words per sentence
            avg_words_per_sentence = word_count / sentence_count if sentence_count > 0 else 0
            
            # Lexical diversity (Type-Token Ratio)
            words = [token.text.lower() for token in doc if not token.is_space and not token.is_punct and token.is_alpha]
            unique_words = set(words)
            lexical_diversity = len(unique_words) / len(words) if len(words) > 0 else 0
            
            # POS tag distribution
            pos_tags = [token.pos_ for token in doc if not token.is_space and not token.is_punct]
            pos_distribution = {}
            for pos in pos_tags:
                pos_distribution[pos] = pos_distribution.get(pos, 0) + 1
            
            return {
                "word_count": word_count,
                "sentence_count": sentence_count,
                "avg_words_per_sentence": round(avg_words_per_sentence, 2),
                "lexical_diversity": round(lexical_diversity, 3),
                "pos_distribution": pos_distribution
            }
            
        except Exception as e:
            logger.error(f"Error extracting linguistic features: {str(e)}")
            return {
                "word_count": 0,
                "sentence_count": 0,
                "avg_words_per_sentence": 0.0,
                "lexical_diversity": 0.0,
                "pos_distribution": {}
            }
    
    def _interpret_results(self, prediction: int, confidence: float, control_prob: float, alz_prob: float) -> tuple:
        """Interpret model results and provide clinical insights"""
        
        # Determine risk level
        if confidence >= 0.8:
            if prediction == 1:  # Alzheimer's indication
                risk_level = "High"
            else:
                risk_level = "Low"
        elif confidence >= 0.6:
            risk_level = "Medium"
        else:
            risk_level = "Medium"  # Uncertain cases
        
        # Generate clinical interpretation
        if prediction == 1:  # Alzheimer's indication
            interpretation = f"""
            The linguistic analysis suggests patterns consistent with cognitive decline associated with Alzheimer's disease.
            
            Key findings:
            • Model confidence: {confidence:.1%}
            • Alzheimer's probability: {alz_prob:.1%}
            • Control probability: {control_prob:.1%}
            • Risk assessment: {risk_level}
            
            Clinical considerations:
            - Speech patterns show characteristics commonly observed in early-stage dementia
            - Reduced semantic fluency and syntactic complexity may be present
            - Consider comprehensive neuropsychological evaluation
            - Monitor for changes in language production over time
            
            Note: This analysis is a screening tool and should not replace comprehensive clinical assessment.
            """
        else:  # Control/Normal
            interpretation = f"""
            The linguistic analysis shows speech patterns within normal cognitive ranges.
            
            Key findings:
            • Model confidence: {confidence:.1%}
            • Control probability: {control_prob:.1%}
            • Alzheimer's probability: {alz_prob:.1%}
            • Risk assessment: {risk_level}
            
            Clinical considerations:
            - Language production appears typical for cognitive age
            - Maintain regular cognitive monitoring as part of preventive care
            - Continue healthy lifestyle practices for brain health
            
            Note: This analysis is a screening tool. Regular cognitive assessments are recommended for ongoing health monitoring.
            """
        
        return risk_level, interpretation.strip()
    
    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Perform complete NLP analysis on input text
        
        Args:
            text (str): Raw text input from speech-to-text
            
        Returns:
            Dict containing analysis results
        """
        if not self.models_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        
        if not text or len(text.strip()) < 10:
            raise ValueError("Text must be at least 10 characters long")
        
        start_time = time.time()
        
        try:
            # 1. Preprocess text (convert to POS tags)
            logger.info("Preprocessing text...")
            preprocessed_text = self._pos_text_complete(text)
            
            # 2. Vectorize preprocessed text
            logger.info("Vectorizing text...")
            text_vector = self.vectorizer.transform([preprocessed_text])
            
            # 3. Get predictions from both models
            logger.info("Getting model predictions...")
            prob_control = self.model_control.predict_proba(text_vector.multiply(self.weights_control))
            prob_alz = self.model_alz.predict_proba(text_vector.multiply(self.weights_alz))
            
            # 4. Determine final prediction (from your original logic)
            prediction = 1 if prob_control[0][1] > prob_alz[0][1] else 0
            confidence = float(prob_control[0][1])
            control_probability = float(prob_control[0][1])
            alzheimer_probability = float(prob_alz[0][1])
            
            # 5. Extract linguistic features
            logger.info("Extracting linguistic features...")
            linguistic_features = self._extract_linguistic_features(text, preprocessed_text)
            
            # 6. Generate clinical interpretation
            risk_level, clinical_interpretation = self._interpret_results(
                prediction, confidence, control_probability, alzheimer_probability
            )
            
            processing_time = time.time() - start_time
            
            logger.info(f"Analysis completed in {processing_time:.2f} seconds")
            
            return {
                "prediction": prediction,
                "confidence": confidence,
                "control_probability": control_probability,
                "alzheimer_probability": alzheimer_probability,
                "risk_level": risk_level,
                "clinical_interpretation": clinical_interpretation,
                "linguistic_features": linguistic_features,
                "preprocessed_text": preprocessed_text,
                "processing_time_seconds": processing_time
            }
            
        except Exception as e:
            logger.error(f"Error in text analysis: {str(e)}")
            raise e
    
    def batch_analyze(self, texts: list) -> list:
        """Analyze multiple texts in batch"""
        if not self.models_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")
        
        results = []
        for i, text in enumerate(texts):
            try:
                logger.info(f"Processing text {i+1}/{len(texts)}")
                result = self.analyze_text(text)
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing text {i+1}: {str(e)}")
                results.append({
                    "error": str(e),
                    "text_index": i
                })
        
        return results
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        return {
            "models_loaded": self.models_loaded,
            "spacy_model": "en_core_web_sm" if self.nlp else None,
            "control_model_type": type(self.model_control).__name__ if self.model_control else None,
            "alzheimer_model_type": type(self.model_alz).__name__ if self.model_alz else None,
            "vectorizer_type": type(self.vectorizer).__name__ if self.vectorizer else None
        }