from flask import Flask, render_template, Response, request, jsonify, send_from_directory, redirect, url_for, session, flash
import cv2
import numpy as np
import os
import requests
from werkzeug.utils import secure_filename
import pyautogui
import logging
import math
import time
import json
from functools import wraps
from database import User, create_token, verify_token
from flask_cors import CORS
import base64
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your-secret-key-here')
app.logger.setLevel(logging.DEBUG)
app.config['SITE_NAME'] = 'QuantumGaze'

# Move API key to environment variable
load_dotenv()

# RapidAPI Configuration
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY', '')  # Get API key from environment variable
RAPIDAPI_HOST = "youtube-v311.p.rapidapi.com"

# Configure allowed extensions
ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg'}

# Configure upload folder
UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth_header.split('Bearer ')[1]
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401
            
        return f(*args, **kwargs)
    return decorated_function

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Initialize face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Global variables
gesture_control_enabled = False
current_video = None
face_present = True
last_pause_time = 0
eyes_closed = False

@app.route('/')
def index():
    if 'username' in session:
        return render_template('index.html', username=session['username'])
    return render_template('index.html')

@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/login', methods=['POST'])
def login_submit():
    try:
        # Handle both form data and JSON data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            flash('Email and password are required', 'error')
            return redirect(url_for('login_page')) if not request.is_json else jsonify({'error': 'Email and password are required'}), 400
        
        user_id = User.verify_user(email, password)
        if not user_id:
            flash('Invalid credentials', 'error')
            return redirect(url_for('login_page')) if not request.is_json else jsonify({'error': 'Invalid credentials'}), 401
        
        # Set session after successful login
        session['username'] = email
        
        if request.is_json:
            token = create_token(user_id)
            return jsonify({
                'token': token,
                'user_id': user_id
            })
        else:
            return redirect(url_for('index'))
            
    except Exception as e:
        flash('An error occurred during login', 'error')
        return redirect(url_for('login_page')) if not request.is_json else jsonify({'error': str(e)}), 401

@app.route('/register', methods=['POST'])
def register_submit():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Create user in MongoDB
        user_id = User.create_user(email, password)
        
        return jsonify({
            'user_id': user_id,
            'message': 'Registration successful'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/user/videos')
@login_required
def get_user_videos():
    username = session['username']
    if username in users:
        return jsonify({'videos': users[username]['videos']})
    return jsonify({'videos': []})

def process_frame(frame):
    # Convert frame to grayscale for face detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    # Draw rectangles around faces
    for (x, y, w, h) in faces:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
    
    return frame

def gen_frames():
    cap = cv2.VideoCapture(0)
    while True:
        success, frame = cap.read()
        if not success:
            break
        else:
            if gesture_control_enabled:
                frame = process_frame(frame)
            
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/upload', methods=['POST'])
@login_required
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            return jsonify({
                'success': True,
                'filename': filename,
                'message': 'Video uploaded successfully'
            })
        except Exception as e:
            app.logger.error(f"Error saving file: {str(e)}")
            return jsonify({'error': 'Error saving file'}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/toggle_gesture_control', methods=['POST'])
@login_required
def toggle_gesture_control():
    """Toggle gesture control for the current user"""
    try:
        # In a real application, you might want to store this in a database
        # For now, we'll just return success
        return jsonify({"enabled": True})
    except Exception as e:
        app.logger.error(f"Error toggling gesture control: {str(e)}")
        return jsonify({"error": "Failed to toggle gesture control"}), 500

@app.route('/movies')
def movies():
    # Get username from session if logged in
    username = session.get('username')
    if not username:
        # Redirect to login if not authenticated
        return redirect(url_for('login_page'))
    return render_template('movies.html', current_user=username)

@app.route('/api/search')
@login_required
def search_videos():
    """Search for videos using YouTube API"""
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({"error": "Search query is required"}), 400
            
        url = f"https://{RAPIDAPI_HOST}/search"
        
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": RAPIDAPI_HOST
        }
        
        params = {
            "q": query,
            "part": "snippet",
            "maxResults": "10",
            "type": "video"
        }
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract relevant information from search results
        videos = []
        for item in data.get("items", []):
            video = {
                "id": item.get("id", {}).get("videoId", ""),
                "title": item.get("snippet", {}).get("title", ""),
                "thumbnail": item.get("snippet", {}).get("thumbnails", {}).get("medium", {}).get("url", ""),
                "channel": item.get("snippet", {}).get("channelTitle", ""),
                "description": item.get("snippet", {}).get("description", ""),
                "published": item.get("snippet", {}).get("publishedAt", "")
            }
            videos.append(video)
            
        return jsonify({"videos": videos})
        
    except requests.RequestException as e:
        app.logger.error(f"Error searching videos: {str(e)}")
        return jsonify({"error": "Failed to search videos"}), 500

@app.route('/process_gesture', methods=['POST'])
def process_gesture():
    try:
        # Get image data from the request
        image_data = request.get_json()['image']
        image_data = image_data.split(',')[1]
        # Convert base64 image to numpy array
        image_bytes = np.frombuffer(base64.b64decode(image_data), np.uint8)
        image = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)
        if image is None or image.size == 0:
            return jsonify({'gesture': None, 'error': 'Invalid image data'})

        # Process the frame for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        gesture_data = {'gesture': None, 'confidence': 0}
        
        if len(faces) > 0:
            # Face detected - you can add more sophisticated gesture detection here
            gesture_data = {'gesture': 'face_detected', 'confidence': 0.9}
        
        # Add the image data to the gesture data
        _, jpeg = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 70])
        jpeg_data = base64.b64encode(jpeg.tobytes()).decode('utf-8')
        gesture_data['image'] = f"data:image/jpeg;base64,{jpeg_data}"
        
        return jsonify(gesture_data)

    except Exception as e:
        app.logger.error(f"Video feed error: {str(e)}")
        return jsonify({'error': str(e)})

@app.route('/gesture_controls', methods=['POST'])
def handle_gesture():
    data = request.get_json()
    gesture = data.get('gesture')
    video_id = data.get('videoId')
    
    app.logger.info(f"Received gesture: {gesture} for video: {video_id}")
    
    # Store the last gesture for this session
    session['last_gesture'] = gesture
    session['last_gesture_time'] = time.time()
    
    if gesture == 'palm':
        return jsonify({'status': 'Play/Pause', 'action': 'toggle'})
    elif gesture == 'point_right':
        return jsonify({'status': 'Forward', 'action': 'forward'})
    elif gesture == 'point_left':
        return jsonify({'status': 'Rewind', 'action': 'rewind'})
    elif gesture == 'index_up':
        return jsonify({'status': 'Volume Up', 'action': 'volume_up'})
    elif gesture == 'fist':
        return jsonify({'status': 'Volume Down', 'action': 'volume_down'})
    else:
        return jsonify({'status': 'Unknown gesture'}), 400

@app.route('/api/video/<video_id>')
@login_required
def get_video_data(video_id):
    """Get video data from YouTube API"""
    try:
        url = f"https://{RAPIDAPI_HOST}/video"
        
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": RAPIDAPI_HOST
        }
        
        params = {"id": video_id}
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract relevant information
        video_data = {
            "title": data.get("items", [{}])[0].get("snippet", {}).get("title", ""),
            "description": data.get("items", [{}])[0].get("snippet", {}).get("description", ""),
            "thumbnail": data.get("items", [{}])[0].get("snippet", {}).get("thumbnails", {}).get("high", {}).get("url", ""),
            "channel": data.get("items", [{}])[0].get("snippet", {}).get("channelTitle", ""),
            "published": data.get("items", [{}])[0].get("snippet", {}).get("publishedAt", ""),
            "views": data.get("items", [{}])[0].get("statistics", {}).get("viewCount", "0"),
            "likes": data.get("items", [{}])[0].get("statistics", {}).get("likeCount", "0")
        }
        
        return jsonify(video_data)
        
    except requests.RequestException as e:
        app.logger.error(f"Error fetching video data: {str(e)}")
        return jsonify({"error": "Failed to fetch video data"}), 500

if __name__ == '__main__':
    app.run(debug=True)