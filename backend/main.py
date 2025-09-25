from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import uvicorn
from datetime import datetime, timedelta
from typing import Optional, List
import logging
import os

# Import custom modules
from database import get_db, create_tables
from models import User, Patient, Assessment, NLPAnalysis, ProgressTracking
from auth import (
    authenticate_user, create_access_token, get_current_user, get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from schemas import (
    UserCreate, UserResponse, Token, PatientCreate, PatientResponse,
    AssessmentCreate, AssessmentResponse, NLPAnalysisCreate, NLPAnalysisResponse,
    NLPPredictionRequest, NLPPredictionResponse
)
from nlp_service import NLPService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize NLP service
nlp_service = NLPService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    logger.info("Creating database tables...")
    create_tables()
    logger.info("Database tables created successfully!")
    
    # Load ML models
    logger.info("Loading NLP models...")
    nlp_service.load_models()
    logger.info("NLP models loaded successfully!")
    
    yield
    
    # Shutdown: cleanup if needed
    logger.info("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Dementia Detection API",
    description="FastAPI backend for Dementia/Alzheimer's Detection System with NLP analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user (doctor/clinician)"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    logger.info(f"New user registered: {db_user.username}")
    return db_user

@app.post("/auth/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Authenticate user and return access token"""
    
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    logger.info(f"User logged in: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

# ============================================================================
# PATIENT MANAGEMENT ENDPOINTS
# ============================================================================

@app.post("/patients", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_data: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new patient record"""
    
    # Generate unique patient ID
    last_patient = db.query(Patient).order_by(Patient.id.desc()).first()
    patient_id = f"P{(last_patient.id + 1):03d}" if last_patient else "P001"
    
    db_patient = Patient(
        patient_id=patient_id,
        doctor_id=current_user.id,
        **patient_data.dict()
    )
    
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    logger.info(f"New patient created: {db_patient.patient_id}")
    return db_patient

@app.get("/patients", response_model=List[PatientResponse])
async def get_patients(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all patients for the current doctor"""
    
    patients = db.query(Patient).filter(
        Patient.doctor_id == current_user.id,
        Patient.is_active == True
    ).offset(skip).limit(limit).all()
    
    return patients

@app.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific patient by ID"""
    
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    return patient

@app.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    patient_data: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update patient information"""
    
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    for field, value in patient_data.dict().items():
        setattr(patient, field, value)
    
    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    
    logger.info(f"Patient updated: {patient.patient_id}")
    return patient

# ============================================================================
# NLP ANALYSIS ENDPOINTS
# ============================================================================

@app.post("/nlp/demo", response_model=NLPPredictionResponse)
async def analyze_text_demo(request: NLPPredictionRequest):
    """Demo endpoint - Analyze text without authentication for testing"""
    try:
        # Perform NLP analysis without authentication
        start_time = datetime.now()
        analysis_result = nlp_service.analyze_text(request.text)
        end_time = datetime.now()
        
        return NLPPredictionResponse(
            analysis_id=f"DEMO{datetime.now().strftime('%Y%m%d%H%M%S')}",
            prediction=analysis_result["prediction"],
            confidence=analysis_result["confidence"],
            control_probability=analysis_result["control_probability"],
            alzheimer_probability=analysis_result["alzheimer_probability"],
            risk_level=analysis_result["risk_level"],
            clinical_interpretation=analysis_result["clinical_interpretation"],
            linguistic_features=analysis_result["linguistic_features"],
            processing_time_ms=int((end_time - start_time).total_seconds() * 1000)
        )
        
    except Exception as e:
        logger.error(f"Error in NLP analysis demo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )

@app.post("/nlp/analyze", response_model=NLPPredictionResponse)
async def analyze_text(
    request: NLPPredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze text for Alzheimer's/dementia indicators using NLP model"""
    
    try:
        # Get patient if patient_id is provided
        patient = None
        if request.patient_id:
            patient = db.query(Patient).filter(
                Patient.patient_id == request.patient_id,
                Patient.doctor_id == current_user.id
            ).first()
            
            if not patient:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Patient not found"
                )
        
        # Perform NLP analysis
        start_time = datetime.now()
        analysis_result = nlp_service.analyze_text(request.text)
        end_time = datetime.now()
        processing_time = int((end_time - start_time).total_seconds() * 1000)
        
        # Generate analysis ID
        last_analysis = db.query(NLPAnalysis).order_by(NLPAnalysis.id.desc()).first()
        analysis_id = f"NLP{(last_analysis.id + 1):03d}" if last_analysis else "NLP001"
        
        # Save to database
        db_analysis = NLPAnalysis(
            analysis_id=analysis_id,
            patient_id=patient.id if patient else None,
            assessment_id=request.assessment_id,
            original_text=request.text,
            preprocessed_text=analysis_result["preprocessed_text"],
            prediction=analysis_result["prediction"],
            confidence_score=analysis_result["confidence"],
            control_probability=analysis_result["control_probability"],
            alzheimer_probability=analysis_result["alzheimer_probability"],
            word_count=analysis_result["linguistic_features"]["word_count"],
            sentence_count=analysis_result["linguistic_features"]["sentence_count"],
            processing_time_ms=processing_time,
            risk_level=analysis_result["risk_level"],
            clinical_notes=analysis_result["clinical_interpretation"]
        )
        
        db.add(db_analysis)
        db.commit()
        db.refresh(db_analysis)
        
        logger.info(f"NLP analysis completed: {db_analysis.analysis_id}")
        
        return NLPPredictionResponse(
            analysis_id=db_analysis.analysis_id,
            prediction=analysis_result["prediction"],
            confidence=analysis_result["confidence"],
            control_probability=analysis_result["control_probability"],
            alzheimer_probability=analysis_result["alzheimer_probability"],
            risk_level=analysis_result["risk_level"],
            clinical_interpretation=analysis_result["clinical_interpretation"],
            linguistic_features=analysis_result["linguistic_features"],
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in NLP analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing text: {str(e)}"
        )

@app.get("/nlp/analyses/{patient_id}", response_model=List[NLPAnalysisResponse])
async def get_patient_analyses(
    patient_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all NLP analyses for a specific patient"""
    
    # Verify patient exists and belongs to current user
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    analyses = db.query(NLPAnalysis).filter(
        NLPAnalysis.patient_id == patient.id
    ).order_by(NLPAnalysis.created_at.desc()).offset(skip).limit(limit).all()
    
    return analyses

# ============================================================================
# ASSESSMENT ENDPOINTS
# ============================================================================

@app.post("/assessments", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    assessment_data: AssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new assessment record"""
    
    # Verify patient exists and belongs to current user
    patient = db.query(Patient).filter(
        Patient.patient_id == assessment_data.patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Generate assessment ID
    last_assessment = db.query(Assessment).order_by(Assessment.id.desc()).first()
    assessment_id = f"A{(last_assessment.id + 1):03d}" if last_assessment else "A001"
    
    db_assessment = Assessment(
        assessment_id=assessment_id,
        patient_id=patient.id,
        **assessment_data.dict(exclude={"patient_id"})
    )
    
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    
    logger.info(f"New assessment created: {db_assessment.assessment_id}")
    return db_assessment

@app.get("/assessments/{patient_id}", response_model=List[AssessmentResponse])
async def get_patient_assessments(
    patient_id: str,
    assessment_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all assessments for a specific patient"""
    
    # Verify patient exists and belongs to current user
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    query = db.query(Assessment).filter(Assessment.patient_id == patient.id)
    
    if assessment_type:
        query = query.filter(Assessment.assessment_type == assessment_type)
    
    assessments = query.order_by(Assessment.created_at.desc()).offset(skip).limit(limit).all()
    
    return assessments

# ============================================================================
# PROGRESS TRACKING ENDPOINTS
# ============================================================================

@app.get("/progress/{patient_id}")
async def get_patient_progress(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get progress tracking data for a patient"""
    
    # Verify patient exists and belongs to current user
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Get assessments over time
    assessments = db.query(Assessment).filter(
        Assessment.patient_id == patient.id,
        Assessment.status == "completed"
    ).order_by(Assessment.completed_at).all()
    
    # Get NLP analyses over time
    nlp_analyses = db.query(NLPAnalysis).filter(
        NLPAnalysis.patient_id == patient.id
    ).order_by(NLPAnalysis.created_at).all()
    
    # Calculate progress metrics
    progress_data = {
        "patient_id": patient_id,
        "assessment_count": len(assessments),
        "nlp_analysis_count": len(nlp_analyses),
        "assessment_timeline": [
            {
                "date": assessment.completed_at.isoformat() if assessment.completed_at else None,
                "type": assessment.assessment_type,
                "score": assessment.total_score
            }
            for assessment in assessments
        ],
        "nlp_timeline": [
            {
                "date": analysis.created_at.isoformat(),
                "confidence": analysis.confidence_score,
                "risk_level": analysis.risk_level,
                "prediction": analysis.prediction
            }
            for analysis in nlp_analyses
        ]
    }
    
    return progress_data

# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "Dementia Detection API is running",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "database": "connected",
            "nlp_models": "loaded" if nlp_service.models_loaded else "not_loaded"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )