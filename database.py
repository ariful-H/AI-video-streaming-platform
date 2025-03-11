import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# SQLite Configuration
DB_PATH = 'quantumgaze.db'
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-here')
JWT_EXPIRATION = int(os.getenv('JWT_EXPIRATION', 3600))  # 1 hour by default

def init_db():
    """Initialize the SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Initialize database
init_db()

class User:
    @staticmethod
    def create_user(email, password):
        """Create a new user in the database"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        try:
            c.execute('SELECT id FROM users WHERE email = ?', (email,))
            if c.fetchone():
                raise ValueError('Email already exists')
            
            hashed_password = generate_password_hash(password)
            c.execute('INSERT INTO users (email, password) VALUES (?, ?)',
                     (email, hashed_password))
            conn.commit()
            return c.lastrowid
        finally:
            conn.close()

    @staticmethod
    def verify_user(email, password):
        """Verify user credentials and return user ID if valid"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        try:
            c.execute('SELECT id, password FROM users WHERE email = ?', (email,))
            user = c.fetchone()
            
            if user and check_password_hash(user[1], password):
                return user[0]
            return None
        finally:
            conn.close()

    @staticmethod
    def get_user(user_id):
        """Get user by ID"""
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        try:
            c.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            return c.fetchone()
        finally:
            conn.close()

def create_token(user_id):
    """Create a JWT token for the user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    """Verify a JWT token and return user ID if valid"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None