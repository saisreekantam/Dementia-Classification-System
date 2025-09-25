# Dementia Detection Backend API

A comprehensive FastAPI backend for dementia/Alzheimer's detection using Natural Language Processing (NLP) analysis of speech patterns.

## Features

- **NLP-based Dementia Detection**: Advanced text analysis using machine learning models to detect Alzheimer's indicators in speech patterns
- **User Authentication**: JWT-based authentication system for healthcare professionals
- **Patient Management**: Complete CRUD operations for patient records and demographics
- **Assessment System**: Structured cognitive assessments with scoring and tracking
- **Progress Tracking**: Longitudinal monitoring of patient cognitive performance
- **RESTful API**: Full REST API with automatic OpenAPI documentation
- **Database Integration**: SQLAlchemy ORM with support for SQLite, PostgreSQL, and MySQL

## Technology Stack

- **Framework**: FastAPI
- **Database**: SQLAlchemy ORM (SQLite/PostgreSQL/MySQL)
- **Authentication**: JWT tokens with bcrypt password hashing
- **NLP**: spaCy, scikit-learn
- **Machine Learning**: Pre-trained models for Alzheimer's detection
- **Validation**: Pydantic models with automatic validation

## Installation

### Prerequisites

- Python 3.8+
- pip package manager

### Setup

1. **Clone the repository and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Download spaCy model:**
   ```bash
   python -m spacy download en_core_web_sm
   ```

5. **Setup environment variables:**
   ```bash
   cp .env.template .env
   # Edit .env file with your configuration
   ```

6. **Initialize database:**
   ```bash
   python init_db.py demo  # Creates tables and demo data
   ```

## Usage

### Starting the Server

**Development mode:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Production mode:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Endpoints**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc

### Database Management

**Initialize database with demo data:**
```bash
python init_db.py demo
```

**Initialize empty database:**
```bash
python init_db.py init
```

**Reset database (⚠️ Warning: Deletes all data):**
```bash
python init_db.py reset
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/token` - Login and get access token
- `GET /auth/me` - Get current user profile

### Patient Management
- `POST /patients` - Create new patient
- `GET /patients` - Get all patients for current doctor
- `GET /patients/{patient_id}` - Get specific patient
- `PUT /patients/{patient_id}` - Update patient information

### NLP Analysis
- `POST /nlp/analyze` - Analyze text for dementia indicators
- `GET /nlp/analyses/{patient_id}` - Get patient's NLP analyses

### Assessments
- `POST /assessments` - Create new assessment
- `GET /assessments/{patient_id}` - Get patient assessments

### Progress Tracking
- `GET /progress/{patient_id}` - Get patient progress data

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health status

## Demo Credentials

After running `python init_db.py demo`, you can use:

**Admin User:**
- Username: `admin`
- Password: `admin123`

**Demo Doctor:**
- Username: `dr_smith`
- Password: `doctor123`

⚠️ **Important**: Change these default passwords in production!

## NLP Model

The system uses pre-trained machine learning models to analyze speech patterns for Alzheimer's detection:

### Analysis Process
1. **Text Preprocessing**: Converts raw text to Part-of-Speech (POS) tags
2. **Feature Extraction**: Uses TF-IDF vectorization with linguistic features
3. **Model Prediction**: Dual model approach (Control vs. Alzheimer's)
4. **Risk Assessment**: Provides risk levels (Low/Medium/High) with confidence scores
5. **Clinical Interpretation**: Generates detailed clinical insights

### Model Files Required
- `model_control.pkl` - Control group classification model
- `model_alz.pkl` - Alzheimer's group classification model  
- `vectorizer.pkl` - TF-IDF vectorizer with POS features

### Usage Example

```python
# Example API request for NLP analysis
POST /nlp/analyze
{
    "text": "The patient showed signs of word-finding difficulty during the assessment...",
    "patient_id": "P001"
}

# Response
{
    "analysis_id": "NLP001",
    "prediction": 1,
    "confidence": 0.78,
    "risk_level": "Medium",
    "clinical_interpretation": "...",
    "linguistic_features": {
        "word_count": 45,
        "sentence_count": 3,
        "lexical_diversity": 0.67
    }
}
```

## Database Schema

### Core Tables
- **Users**: Healthcare professionals and admin users
- **Patients**: Patient demographics and medical information
- **Assessments**: Cognitive assessment results and scores
- **NLP Analyses**: Text analysis results with model predictions
- **Progress Tracking**: Longitudinal patient performance data

### Relationships
- Users (doctors) have many Patients
- Patients have many Assessments and NLP Analyses
- Progress tracking links to Patients over time

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt hashing for password security
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Pydantic models for request/response validation
- **Role-based Access**: Support for different user roles (doctor, admin, researcher)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///./dementia_detection.db` |
| `SECRET_KEY` | JWT signing secret | ⚠️ Change in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `1440` (24 hours) |
| `API_HOST` | Server host | `0.0.0.0` |
| `API_PORT` | Server port | `8000` |

### Model Configuration
- Place ML model files (`*.pkl`) in the `backend/` directory
- Ensure spaCy `en_core_web_sm` model is installed
- Configure confidence thresholds in environment variables

## Development

### Testing
```bash
# Run tests (if available)
pytest

# Test API endpoints
python -m pytest tests/
```

### Code Structure
```
backend/
├── main.py              # FastAPI application entry point
├── models.py            # SQLAlchemy database models
├── schemas.py           # Pydantic validation schemas
├── database.py          # Database configuration and connection
├── auth.py              # Authentication and security functions
├── nlp_service.py       # NLP analysis service
├── init_db.py           # Database initialization script
├── requirements.txt     # Python dependencies
├── .env.template        # Environment variables template
└── README.md           # This file
```

## Production Deployment

### Using Docker (Recommended)

Create a `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN python -m spacy download en_core_web_sm

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using systemd (Linux)
1. Create service file at `/etc/systemd/system/dementia-api.service`
2. Configure proper user, paths, and environment
3. Enable and start service

### Environment Setup
- Use PostgreSQL for production database
- Set secure `SECRET_KEY`
- Configure proper CORS origins
- Set up SSL/TLS termination (nginx/Apache)
- Configure logging and monitoring

## API Documentation

Interactive API documentation is automatically generated and available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Support

For questions or issues:
1. Check the API documentation at `/docs`
2. Review logs for error details
3. Ensure all ML model files are present
4. Verify environment configuration

## License

This project is part of a dementia detection system for healthcare applications.