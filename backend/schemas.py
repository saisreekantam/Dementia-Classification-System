from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ============================================================================
# ENUMS
# ============================================================================

class UserRole(str, Enum):
    doctor = "doctor"
    admin = "admin"
    researcher = "researcher"

class Gender(str, Enum):
    male = "Male"
    female = "Female"
    other = "Other"

class AssessmentStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class RiskLevel(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"

# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = UserRole.doctor

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# ============================================================================
# PATIENT SCHEMAS
# ============================================================================

class PatientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    date_of_birth: datetime
    gender: Gender
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)
    medical_history: Optional[str] = None
    education_level: Optional[str] = Field(None, max_length=50)
    occupation: Optional[str] = Field(None, max_length=100)
    dominant_hand: Optional[str] = Field("Right", max_length=10)
    notes: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: int
    patient_id: str
    doctor_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ============================================================================
# ASSESSMENT SCHEMAS
# ============================================================================

class AssessmentBase(BaseModel):
    assessment_type: str = Field(..., max_length=50)
    status: AssessmentStatus = AssessmentStatus.in_progress
    
    # Memory Assessment fields
    immediate_recall_score: Optional[int] = None
    immediate_recall_words: Optional[List[str]] = None
    delayed_recall_score: Optional[int] = None
    delayed_recall_words: Optional[List[str]] = None
    distraction_task_score: Optional[int] = None
    distraction_task_data: Optional[Dict[str, Any]] = None
    
    # Verbal Fluency fields
    verbal_fluency_score: Optional[int] = None
    verbal_fluency_words: Optional[List[str]] = None
    verbal_fluency_category: Optional[str] = None
    
    # Trail Making fields
    trail_a_time: Optional[float] = None
    trail_b_time: Optional[float] = None
    trail_a_errors: Optional[int] = None
    trail_b_errors: Optional[int] = None
    
    # Overall scoring
    total_score: Optional[float] = None
    percentile_score: Optional[float] = None
    cognitive_domain_scores: Optional[Dict[str, float]] = None
    interpretation: Optional[str] = None
    recommendations: Optional[str] = None
    
    notes: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None

class AssessmentCreate(AssessmentBase):
    patient_id: str

class AssessmentUpdate(BaseModel):
    status: Optional[AssessmentStatus] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    
    # All other fields from AssessmentBase
    immediate_recall_score: Optional[int] = None
    immediate_recall_words: Optional[List[str]] = None
    delayed_recall_score: Optional[int] = None
    delayed_recall_words: Optional[List[str]] = None
    distraction_task_score: Optional[int] = None
    distraction_task_data: Optional[Dict[str, Any]] = None
    
    verbal_fluency_score: Optional[int] = None
    verbal_fluency_words: Optional[List[str]] = None
    verbal_fluency_category: Optional[str] = None
    
    trail_a_time: Optional[float] = None
    trail_b_time: Optional[float] = None
    trail_a_errors: Optional[int] = None
    trail_b_errors: Optional[int] = None
    
    total_score: Optional[float] = None
    percentile_score: Optional[float] = None
    cognitive_domain_scores: Optional[Dict[str, float]] = None
    interpretation: Optional[str] = None
    recommendations: Optional[str] = None
    
    notes: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None

class AssessmentResponse(AssessmentBase):
    id: int
    assessment_id: str
    patient_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ============================================================================
# NLP ANALYSIS SCHEMAS
# ============================================================================

class NLPPredictionRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=10000)
    patient_id: Optional[str] = None
    assessment_id: Optional[int] = None

class LinguisticFeatures(BaseModel):
    word_count: int
    sentence_count: int
    avg_words_per_sentence: float
    lexical_diversity: Optional[float] = None
    pos_distribution: Optional[Dict[str, int]] = None

class NLPPredictionResponse(BaseModel):
    analysis_id: str
    prediction: int  # 0 = Control, 1 = Alzheimer's indication
    confidence: float
    control_probability: float
    alzheimer_probability: float
    risk_level: RiskLevel
    clinical_interpretation: str
    linguistic_features: LinguisticFeatures
    processing_time_ms: int

class NLPAnalysisBase(BaseModel):
    original_text: str
    prediction: int
    confidence_score: float
    control_probability: float
    alzheimer_probability: float
    risk_level: RiskLevel
    clinical_notes: Optional[str] = None

class NLPAnalysisCreate(NLPAnalysisBase):
    patient_id: Optional[str] = None
    assessment_id: Optional[int] = None

class NLPAnalysisResponse(NLPAnalysisBase):
    id: int
    analysis_id: str
    patient_id: Optional[int] = None
    assessment_id: Optional[int] = None
    preprocessed_text: Optional[str] = None
    word_count: Optional[int] = None
    sentence_count: Optional[int] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============================================================================
# PROGRESS TRACKING SCHEMAS
# ============================================================================

class AssessmentTimelineItem(BaseModel):
    date: Optional[str] = None
    type: str
    score: Optional[float] = None

class NLPTimelineItem(BaseModel):
    date: str
    confidence: float
    risk_level: str
    prediction: int

class ProgressResponse(BaseModel):
    patient_id: str
    assessment_count: int
    nlp_analysis_count: int
    assessment_timeline: List[AssessmentTimelineItem]
    nlp_timeline: List[NLPTimelineItem]

# ============================================================================
# SYSTEM SCHEMAS
# ============================================================================

class HealthCheck(BaseModel):
    status: str
    services: Dict[str, str]
    timestamp: str

class APIResponse(BaseModel):
    message: str
    version: str
    timestamp: str