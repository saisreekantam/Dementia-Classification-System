from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), default="doctor")  # doctor, admin, researcher
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patients = relationship("Patient", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(20), unique=True, index=True, nullable=False)  # P001, P002, etc.
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    gender = Column(String(10), nullable=False)  # Male, Female, Other
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    emergency_contact_name = Column(String(100))
    emergency_contact_phone = Column(String(20))
    medical_history = Column(Text)  # JSON string of medical history
    education_level = Column(String(50))  # High School, Bachelor's, Master's, PhD, etc.
    occupation = Column(String(100))
    dominant_hand = Column(String(10), default="Right")  # Right, Left, Ambidextrous
    notes = Column(Text)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    doctor = relationship("User", back_populates="patients")
    assessments = relationship("Assessment", back_populates="patient")
    nlp_analyses = relationship("NLPAnalysis", back_populates="patient")

class Assessment(Base):
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(String(20), unique=True, index=True, nullable=False)  # A001, A002, etc.
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    assessment_type = Column(String(50), nullable=False)  # Memory, Verbal Fluency, Trail Making, etc.
    status = Column(String(20), default="in_progress")  # in_progress, completed, cancelled
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    duration_minutes = Column(Float)  # Total time taken for assessment
    
    # Memory Assessment specific fields
    immediate_recall_score = Column(Integer)  # Number of words recalled immediately
    immediate_recall_words = Column(JSON)  # List of words recalled
    delayed_recall_score = Column(Integer)  # Number of words recalled after delay
    delayed_recall_words = Column(JSON)  # List of words recalled after delay
    distraction_task_score = Column(Integer)  # Score for distraction task
    distraction_task_data = Column(JSON)  # Data from distraction task
    
    # Verbal Fluency specific fields
    verbal_fluency_score = Column(Integer)  # Number of valid words
    verbal_fluency_words = Column(JSON)  # List of words generated
    verbal_fluency_category = Column(String(50))  # Animals, Foods, etc.
    
    # Trail Making specific fields
    trail_a_time = Column(Float)  # Time for Trail A in seconds
    trail_b_time = Column(Float)  # Time for Trail B in seconds
    trail_a_errors = Column(Integer)  # Number of errors in Trail A
    trail_b_errors = Column(Integer)  # Number of errors in Trail B
    
    # Overall scoring
    total_score = Column(Float)
    percentile_score = Column(Float)  # Compared to age-matched norms
    cognitive_domain_scores = Column(JSON)  # Breakdown by cognitive domain
    interpretation = Column(Text)  # Clinical interpretation
    recommendations = Column(Text)  # Follow-up recommendations
    
    # Additional metadata
    assessment_version = Column(String(10), default="1.0")
    raw_data = Column(JSON)  # Store any additional raw data
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="assessments")

class NLPAnalysis(Base):
    __tablename__ = "nlp_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(20), unique=True, index=True, nullable=False)  # NLP001, NLP002, etc.
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=True)  # Link to specific assessment if applicable
    
    # Input data
    original_text = Column(Text, nullable=False)  # Original speech-to-text input
    preprocessed_text = Column(Text)  # Text after preprocessing
    
    # NLP Model Results
    prediction = Column(Integer)  # 0 = Control, 1 = Alzheimer's indication
    confidence_score = Column(Float)  # Confidence level (0.0 to 1.0)
    control_probability = Column(Float)  # Probability of being in control group
    alzheimer_probability = Column(Float)  # Probability of Alzheimer's indication
    
    # Linguistic features (extracted during preprocessing)
    pos_tags = Column(JSON)  # Part-of-speech tag distribution
    word_count = Column(Integer)
    sentence_count = Column(Integer)
    avg_words_per_sentence = Column(Float)
    lexical_diversity = Column(Float)  # Type-token ratio
    semantic_fluency_score = Column(Float)
    syntactic_complexity = Column(Float)
    
    # Clinical interpretation
    risk_level = Column(String(20))  # Low, Medium, High
    clinical_notes = Column(Text)
    follow_up_recommended = Column(Boolean, default=False)
    
    # Processing metadata
    model_version = Column(String(20), default="1.0")
    processing_time_ms = Column(Integer)  # Time taken for analysis
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="nlp_analyses")
    assessment = relationship("Assessment")

class ProgressTracking(Base):
    __tablename__ = "progress_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    # Timeline data
    assessment_date = Column(DateTime, nullable=False)
    assessment_type = Column(String(50), nullable=False)
    
    # Scores over time
    cognitive_score = Column(Float)  # Overall cognitive score
    memory_score = Column(Float)
    language_score = Column(Float)
    executive_function_score = Column(Float)
    attention_score = Column(Float)
    processing_speed_score = Column(Float)
    
    # NLP specific tracking
    nlp_confidence_trend = Column(Float)  # Trend in NLP confidence over time
    linguistic_complexity_trend = Column(Float)
    
    # Clinical markers
    functional_status = Column(String(50))  # Independent, Mild Impairment, Moderate, Severe
    medication_changes = Column(JSON)  # Any medication changes since last assessment
    lifestyle_factors = Column(JSON)  # Exercise, diet, sleep, social engagement
    
    # Progress indicators
    improvement_areas = Column(JSON)  # Areas showing improvement
    decline_areas = Column(JSON)  # Areas showing decline
    stability_areas = Column(JSON)  # Areas remaining stable
    
    # Intervention tracking
    interventions_applied = Column(JSON)  # Cognitive training, therapy, etc.
    intervention_response = Column(Text)  # Response to interventions
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient")

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), unique=True, nullable=False)
    setting_value = Column(Text, nullable=False)
    description = Column(Text)
    data_type = Column(String(20), default="string")  # string, integer, float, boolean, json
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Assessment templates and normative data
class AssessmentTemplate(Base):
    __tablename__ = "assessment_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(100), unique=True, nullable=False)
    assessment_type = Column(String(50), nullable=False)
    version = Column(String(10), default="1.0")
    
    # Template configuration
    word_lists = Column(JSON)  # For memory assessments
    instructions = Column(JSON)  # Step-by-step instructions
    scoring_rubric = Column(JSON)  # How to score the assessment
    normative_data = Column(JSON)  # Age-matched norms for comparison
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)