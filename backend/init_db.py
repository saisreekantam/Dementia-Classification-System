#!/usr/bin/env python3
"""
Database initialization script for Dementia Detection System
"""

import sys
import os
from datetime import datetime, date
from sqlalchemy.exc import IntegrityError

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, create_tables, drop_tables
from models import User, Patient, Assessment, NLPAnalysis, SystemSettings, AssessmentTemplate
from auth import get_password_hash
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize database with tables"""
    logger.info("Creating database tables...")
    create_tables()
    logger.info("Database tables created successfully!")

def create_admin_user():
    """Create default admin user"""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            logger.info("Admin user already exists")
            return
        
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@dementiadetection.com",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin123"),  # Change this in production!
            role="admin",
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        logger.info("Admin user created successfully!")
        logger.warning("Please change the default admin password!")
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error creating admin user: {str(e)}")
    finally:
        db.close()

def create_demo_doctor():
    """Create demo doctor user"""
    db = SessionLocal()
    try:
        # Check if demo doctor already exists
        demo_doctor = db.query(User).filter(User.username == "dr_smith").first()
        if demo_doctor:
            logger.info("Demo doctor already exists")
            return
        
        # Create demo doctor
        demo_doctor = User(
            username="dr_smith",
            email="dr.smith@hospital.com", 
            full_name="Dr. John Smith",
            hashed_password=get_password_hash("doctor123"),  # Change this in production!
            role="doctor",
            is_active=True
        )
        
        db.add(demo_doctor)
        db.commit()
        logger.info("Demo doctor created successfully!")
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error creating demo doctor: {str(e)}")
    finally:
        db.close()

def create_demo_patients():
    """Create demo patients"""
    db = SessionLocal()
    try:
        # Get demo doctor
        demo_doctor = db.query(User).filter(User.username == "dr_smith").first()
        if not demo_doctor:
            logger.error("Demo doctor not found. Create doctor first.")
            return
        
        # Demo patients data
        demo_patients = [
            {
                "patient_id": "P001",
                "first_name": "Alice",
                "last_name": "Johnson",
                "date_of_birth": datetime(1945, 5, 15),
                "gender": "Female",
                "phone": "(555) 123-4567",
                "email": "alice.johnson@email.com",
                "education_level": "Bachelor's Degree",
                "occupation": "Retired Teacher",
                "medical_history": "Hypertension, managed with medication. No history of neurological disorders.",
                "notes": "Patient reports occasional memory lapses. Referred for cognitive assessment."
            },
            {
                "patient_id": "P002", 
                "first_name": "Robert",
                "last_name": "Williams",
                "date_of_birth": datetime(1938, 11, 22),
                "gender": "Male",
                "phone": "(555) 987-6543",
                "email": "r.williams@email.com",
                "education_level": "High School",
                "occupation": "Retired Mechanic",
                "medical_history": "Type 2 diabetes, well controlled. Mild hearing loss.",
                "notes": "Family history of Alzheimer's disease. Proactive screening."
            },
            {
                "patient_id": "P003",
                "first_name": "Margaret",
                "last_name": "Davis",
                "date_of_birth": datetime(1950, 8, 30),
                "gender": "Female",
                "phone": "(555) 456-7890",
                "education_level": "Master's Degree",
                "occupation": "Retired Librarian",
                "medical_history": "No significant medical history.",
                "notes": "Baseline cognitive assessment for healthy aging study."
            }
        ]
        
        for patient_data in demo_patients:
            # Check if patient already exists
            existing_patient = db.query(Patient).filter(
                Patient.patient_id == patient_data["patient_id"]
            ).first()
            
            if existing_patient:
                logger.info(f"Patient {patient_data['patient_id']} already exists")
                continue
            
            # Create patient
            patient = Patient(
                doctor_id=demo_doctor.id,
                **patient_data
            )
            
            db.add(patient)
            logger.info(f"Created demo patient: {patient_data['patient_id']}")
        
        db.commit()
        logger.info("Demo patients created successfully!")
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error creating demo patients: {str(e)}")
    finally:
        db.close()

def create_system_settings():
    """Create default system settings"""
    db = SessionLocal()
    try:
        default_settings = [
            {
                "setting_key": "nlp_model_version",
                "setting_value": "1.0",
                "description": "Current version of the NLP models",
                "data_type": "string"
            },
            {
                "setting_key": "assessment_timeout_minutes",
                "setting_value": "30",
                "description": "Maximum time allowed for assessments in minutes",
                "data_type": "integer"
            },
            {
                "setting_key": "confidence_threshold_high",
                "setting_value": "0.8",
                "description": "Confidence threshold for high-risk classification",
                "data_type": "float"
            },
            {
                "setting_key": "confidence_threshold_medium",
                "setting_value": "0.6",
                "description": "Confidence threshold for medium-risk classification",
                "data_type": "float"
            },
            {
                "setting_key": "enable_email_notifications",
                "setting_value": "false",
                "description": "Enable email notifications for high-risk assessments",
                "data_type": "boolean"
            }
        ]
        
        for setting_data in default_settings:
            # Check if setting already exists
            existing_setting = db.query(SystemSettings).filter(
                SystemSettings.setting_key == setting_data["setting_key"]
            ).first()
            
            if existing_setting:
                continue
            
            # Create setting
            setting = SystemSettings(**setting_data)
            db.add(setting)
        
        db.commit()
        logger.info("System settings created successfully!")
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error creating system settings: {str(e)}")
    finally:
        db.close()

def create_assessment_templates():
    """Create default assessment templates"""
    db = SessionLocal()
    try:
        # Memory Assessment Template
        memory_template = {
            "template_name": "Standard Memory Recall Test",
            "assessment_type": "Memory",
            "version": "1.0",
            "word_lists": {
                "list_a": ["apple", "pencil", "chair", "flower", "music", "telephone", "elephant", "candle", "window", "bicycle"],
                "list_b": ["orange", "paper", "table", "garden", "radio", "computer", "lion", "lamp", "door", "airplane"],
                "list_c": ["banana", "book", "sofa", "tree", "piano", "camera", "tiger", "mirror", "wall", "train"]
            },
            "instructions": {
                "immediate_recall": "I will read you a list of words. Please listen carefully and repeat back as many as you can remember in any order.",
                "distraction": "Now, please count backwards from 20 to 1.",
                "delayed_recall": "Earlier I read you a list of words. Can you tell me any of those words you still remember?"
            },
            "scoring_rubric": {
                "immediate_recall": {
                    "max_score": 10,
                    "scoring": "1 point per correctly recalled word"
                },
                "delayed_recall": {
                    "max_score": 10,
                    "scoring": "1 point per correctly recalled word"
                },
                "total_score": {
                    "max_score": 20,
                    "interpretation": {
                        "18-20": "Excellent memory performance",
                        "15-17": "Good memory performance", 
                        "12-14": "Average memory performance",
                        "8-11": "Below average, consider follow-up",
                        "0-7": "Significant concerns, immediate evaluation recommended"
                    }
                }
            },
            "normative_data": {
                "age_65_74": {"mean": 16.2, "std": 2.8},
                "age_75_84": {"mean": 14.8, "std": 3.2},
                "age_85_plus": {"mean": 12.5, "std": 3.8}
            }
        }
        
        # Check if template exists
        existing_template = db.query(AssessmentTemplate).filter(
            AssessmentTemplate.template_name == memory_template["template_name"]
        ).first()
        
        if not existing_template:
            template = AssessmentTemplate(**memory_template)
            db.add(template)
            db.commit()
            logger.info("Memory assessment template created successfully!")
        else:
            logger.info("Memory assessment template already exists")
            
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error creating assessment templates: {str(e)}")
    finally:
        db.close()

def create_demo_data():
    """Create comprehensive demo data"""
    logger.info("Creating demo data...")
    
    create_admin_user()
    create_demo_doctor() 
    create_demo_patients()
    create_system_settings()
    create_assessment_templates()
    
    logger.info("Demo data creation completed!")

def reset_database():
    """Reset database (WARNING: This will delete all data!)"""
    response = input("WARNING: This will delete all data! Are you sure? (type 'yes' to confirm): ")
    if response.lower() != 'yes':
        logger.info("Database reset cancelled")
        return
    
    logger.info("Dropping all tables...")
    drop_tables()
    
    logger.info("Recreating tables...")
    create_tables()
    
    logger.info("Database reset completed!")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python init_db.py [init|demo|reset]")
        print("  init  - Initialize database tables")
        print("  demo  - Create demo data")
        print("  reset - Reset database (WARNING: deletes all data)")
        return
    
    command = sys.argv[1].lower()
    
    if command == "init":
        init_database()
    elif command == "demo":
        init_database()
        create_demo_data()
    elif command == "reset":
        reset_database()
    else:
        print(f"Unknown command: {command}")
        print("Valid commands: init, demo, reset")

if __name__ == "__main__":
    main()