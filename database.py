import hashlib
import os
import time
import jwt

# Simple in-memory database for demonstration
users = {}

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-here')

class User:
    @staticmethod
    def create_user(email, password):
        # Check if user already exists
        for user_id, user_data in users.items():
            if user_data['email'] == email:
                raise Exception("User with this email already exists")
        
        # Hash the password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Generate a simple user ID
        user_id = str(len(users) + 1)
        
        # Store the user
        users[user_id] = {
            'email': email,
            'password': hashed_password,
            'created_at': time.time()
        }
        
        return user_id
    
    @staticmethod
    def verify_user(email, password):
        # Hash the password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Check if user exists and password matches
        for user_id, user_data in users.items():
            if user_data['email'] == email and user_data['password'] == hashed_password:
                return user_id
        
        return None

def create_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': time.time() + 86400  # 24 hours
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except:
        return None