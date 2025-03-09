from flask import Flask, render_template, Response, request, jsonify, send_from_directory, redirect, url_for, session, flash
import cv2
import numpy as np
import mediapipe as mp
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

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your-secret-key-here')
app.logger.setLevel(logging.DEBUG)
app.config['SITE_NAME'] = 'QuantumGaze'

# RapidAPI Configuration
RAPIDAPI_KEY = "2eaf2be0d1msh48f50fe2afeaa3cp167efajsn2d2c5e509894"
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

# Initialize MediaPipe
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
drawing = mp.solutions.drawing_utils

# Initialize MediaPipe Face Detection
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(min_detection_confidence=0.5)

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

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/login', methods=['POST'])
def login_submit():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user_id = User.verify_user(email, password)
        if not user_id:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        token = create_token(user_id)
        return jsonify({
            'token': token,
            'user_id': user_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 401

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

# Improved finger counting function
def count_fingers(hand_landmarks):
    cnt = 0
    thresh = (hand_landmarks.landmark[0].y * 100 - hand_landmarks.landmark[9].y * 100) / 2

    if (hand_landmarks.landmark[5].y * 100 - hand_landmarks.landmark[8].y * 100) > thresh:
        cnt += 1
    if (hand_landmarks.landmark[9].y * 100 - hand_landmarks.landmark[12].y * 100) > thresh:
        cnt += 1
    if (hand_landmarks.landmark[13].y * 100 - hand_landmarks.landmark[16].y * 100) > thresh:
        cnt += 1
    if (hand_landmarks.landmark[17].y * 100 - hand_landmarks.landmark[20].y * 100) > thresh:
        cnt += 1
    if (hand_landmarks.landmark[5].x * 100 - hand_landmarks.landmark[4].x * 100) > 6:
        cnt += 1
    
    return cnt

# Map finger count to gestures
def get_gesture_from_finger_count(finger_count):
    gesture_map = {
        1: 'point_right',  # One finger - forward
        2: 'point_left',   # Two fingers - rewind
        3: 'index_up',     # Three fingers - volume up
        4: 'fist',         # Four fingers - volume down
        5: 'palm'          # Five fingers - play/pause
    }
    
    return gesture_map.get(finger_count, None)

def check_eyes_closed(face_landmarks, frame):
    left_eye = [(33, 160), (158, 144), (153, 145)]
    right_eye = [(362, 386), (382, 398), (384, 381)]
    
    def calculate_eye_ratio(eye_points):
        h, w, _ = frame.shape
        points = []
        for p1, p2 in eye_points:
            x1 = int(face_landmarks.landmark[p1].x * w)
            y1 = int(face_landmarks.landmark[p1].y * h)
            x2 = int(face_landmarks.landmark[p2].x * w)
            y2 = int(face_landmarks.landmark[p2].y * h)
            points.append(math.dist((x1, y1), (x2, y2)))
        
        return sum(points) / len(points)
    
    left_ratio = calculate_eye_ratio(left_eye)
    right_ratio = calculate_eye_ratio(right_eye)
    
    return (left_ratio + right_ratio) / 2 < 5

def calculate_face_rotation(face_landmarks, image):
    if not face_landmarks:
        return None
    
    nose_tip = face_landmarks.landmark[1]
    left_eye = face_landmarks.landmark[33]
    right_eye = face_landmarks.landmark[263]
    
    h, w, _ = image.shape
    nose_px = (int(nose_tip.x * w), int(nose_tip.y * h))
    left_eye_px = (int(left_eye.x * w), int(left_eye.y * h))
    right_eye_px = (int(right_eye.x * w), int(right_eye.y * h))
    
    left_dist = math.dist(nose_px, left_eye_px)
    right_dist = math.dist(nose_px, right_eye_px)
    
    if left_dist > 0 and right_dist > 0:
        ratio = left_dist / right_dist
        return ratio
    return None

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

        # Process face landmarks for advanced face tracking
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        face_results = face_mesh.process(image_rgb)
        
        # Check for face presence and orientation
        if face_results.multi_face_landmarks:
            face_landmarks = face_results.multi_face_landmarks[0]
            
            # Check for eyes closed
            eyes_closed = check_eyes_closed(face_landmarks, image)
            
            # Check face rotation
            face_rotation = calculate_face_rotation(face_landmarks, image)
            
            # Determine if face is turned away
            face_turned = face_rotation and (face_rotation < 0.7 or face_rotation > 1.3)
            
            if eyes_closed or face_turned:
                return jsonify({'gesture': 'pause', 'auto_pause': True})

        # Process hand landmarks for gesture control
        hand_results = hands.process(image_rgb)
        if hand_results.multi_hand_landmarks:
            hand_landmarks = hand_results.multi_hand_landmarks[0]
            gesture = get_gesture_from_finger_count(count_fingers(hand_landmarks))
            
            if gesture:
                return jsonify({'gesture': gesture})

        return jsonify({'gesture': None})

    except Exception as e:
        app.logger.error(f'Error processing gesture: {str(e)}')
        return jsonify({'gesture': None, 'error': str(e)})
    
    # Process face
    face_results = face_mesh.process(frame_rgb)
    if face_results.multi_face_landmarks:
        face_landmarks = face_results.multi_face_landmarks[0]
        drawing.draw_landmarks(
            frame,
            face_landmarks,
            mp_face_mesh.FACEMESH_CONTOURS,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp.solutions.drawing_styles.get_default_face_mesh_contours_style()
        )
        
        # Check eyes
        if check_eyes_closed(face_landmarks, frame):
            cv2.putText(frame, "Eyes Closed - Paused", (10, 120),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            pyautogui.press('space')
        
        # Check face rotation
        rotation_ratio = calculate_face_rotation(face_landmarks, frame)
        if rotation_ratio is not None:
            cv2.putText(frame, f"Rotation: {rotation_ratio:.2f}", (10, 150),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            if rotation_ratio < 0.6 or rotation_ratio > 1.4:
                cv2.putText(frame, "Head Turned - Paused", (10, 180),
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                pyautogui.press('space')
    
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
    def generate():
        # Use a lower resolution for better performance
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 15)  # Lower FPS for better processing
        
        # Add a small delay to ensure camera is properly initialized
        time.sleep(0.5)
        
        # Check if camera opened successfully
        if not cap.isOpened():
            app.logger.error("Error: Could not open camera.")
            yield f"data: {json.dumps({'error': 'Could not open camera'})}\n\n"
            return
            
        try:
            while True:
                # Read a frame from the camera
                success, frame = cap.read()
                if not success:
                    app.logger.error("Error: Failed to read frame from camera.")
                    yield f"data: {json.dumps({'error': 'Failed to read frame'})}\n\n"
                    # Try to reconnect
                    cap.release()
                    cap = cv2.VideoCapture(0)
                    time.sleep(1)  # Wait before trying again
                    continue
                
                # Resize frame for faster processing
                frame = cv2.resize(frame, (320, 240))
                
                # Process the frame with MediaPipe (more efficient)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = hands.process(frame_rgb)
                
                # Initialize gesture data
                gesture_data = {'gesture': None, 'confidence': 0}
                
                # Process hand landmarks if detected
                if results.multi_hand_landmarks:
                    # Get the first detected hand
                    hand_landmarks = results.multi_hand_landmarks[0]
                    
                    # Draw landmarks on the frame
                    drawing.draw_landmarks(
                        frame, 
                        hand_landmarks, 
                        mp_hands.HAND_CONNECTIONS,
                        drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=4),
                        drawing.DrawingSpec(color=(255, 255, 255), thickness=2)
                    )
                    
                    # Detect gesture (optimized)
                    gesture, confidence = detect_gesture(hand_landmarks)
                    gesture_data = {'gesture': gesture, 'confidence': confidence}
                
                # Convert the frame to JPEG
                _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])  # Lower quality for faster transmission
                jpeg_data = base64.b64encode(jpeg.tobytes()).decode('utf-8')
                
                # Add the image data to the gesture data
                gesture_data['image'] = f"data:image/jpeg;base64,{jpeg_data}"
                
                # Send the gesture data with the image
                yield f"data: {json.dumps(gesture_data)}\n\n"
                
                # Limit the frame rate but not too much
                time.sleep(0.05)
                
        except Exception as e:
            app.logger.error(f"Video feed error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if 'cap' in locals() and cap is not None:
                cap.release()
    
    return Response(generate(), mimetype='text/event-stream')

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
            
            # Add video to user's library
            username = session['username']
            if username in users:
                users[username]['videos'].append({
                    'filename': filename,
                    'uploaded_at': time.time()
                })
            
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
def toggle_gesture_control():
    global gesture_control_enabled
    gesture_control_enabled = not gesture_control_enabled
    return jsonify({'enabled': gesture_control_enabled})

@app.route('/movies')
def movies():
    return render_template('movies.html')

@app.route('/search_videos', methods=['GET'])
def search_videos():
    query = request.args.get('query', '')
    if not query:
        return jsonify({'success': False, 'error': 'No search query provided'})
    
    # This is a mock response - in a real app, you would call the YouTube API
    mock_videos = [
        {
            'id': 'dQw4w9WgXcQ',
            'title': 'Rick Astley - Never Gonna Give You Up',
            'thumbnail': 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
            'views': 1234567,
            'likes': 98765,
            'duration': 'PT3M32S'
        },
        {
            'id': '9bZkp7q19f0',
            'title': 'PSY - GANGNAM STYLE(강남스타일)',
            'thumbnail': 'https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg',
            'views': 4567890,
            'likes': 345678,
            'duration': 'PT4M13S'
        },
        {
            'id': 'kJQP7kiw5Fk',
            'title': 'Luis Fonsi - Despacito ft. Daddy Yankee',
            'thumbnail': 'https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
            'views': 7890123,
            'likes': 567890,
            'duration': 'PT4M42S'
        }
    ]
    
    return jsonify({'success': True, 'videos': mock_videos})

# Optimize the gesture detection function
def detect_gesture(hand_landmarks):
    # Get key points
    wrist = hand_landmarks.landmark[mp_hands.HandLandmark.WRIST]
    thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
    index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
    middle_tip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
    ring_tip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_TIP]
    pinky_tip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_TIP]
    
    # Calculate extended fingers using a simpler method
    extended_fingers = []
    
    # Check thumb
    if thumb_tip.x < wrist.x:  # For right hand
        if thumb_tip.x < hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_IP].x:
            extended_fingers.append(1)
        else:
            extended_fingers.append(0)
    else:  # For left hand
        if thumb_tip.x > hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_IP].x:
            extended_fingers.append(1)
        else:
            extended_fingers.append(0)
    
    # Check other fingers
    fingers = [
        (index_tip, hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_PIP]),
        (middle_tip, hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_PIP]),
        (ring_tip, hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_PIP]),
        (pinky_tip, hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_PIP])
    ]
    
    for tip, pip in fingers:
        if tip.y < pip.y:  # If fingertip is higher than PIP joint
            extended_fingers.append(1)
        else:
            extended_fingers.append(0)
    
    # Count extended fingers
    finger_count = sum(extended_fingers)
    
    # Determine gesture based on finger count and positions
    gesture = None
    confidence = 0.7  # Default confidence
    
    if finger_count == 1 and extended_fingers[1] == 1:
        # Only index finger extended
        gesture = "point_right"
        confidence = 0.85
    elif finger_count == 2 and extended_fingers[1] == 1 and extended_fingers[2] == 1:
        # Index and middle fingers extended
        gesture = "point_left"
        confidence = 0.85
    elif finger_count == 3 and extended_fingers[1] == 1 and extended_fingers[2] == 1 and extended_fingers[3] == 1:
        # Index, middle, and ring fingers extended
        gesture = "index_up"
        confidence = 0.8
    elif finger_count == 0 or (finger_count == 1 and extended_fingers[0] == 1):
        # Fist (no fingers or only thumb)
        gesture = "fist"
        confidence = 0.9
    elif finger_count >= 4:
        # Open palm (most fingers extended)
        gesture = "palm"
        confidence = 0.95
    
    return gesture, confidence

# Add this new endpoint for gesture controls
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

if __name__ == '__main__':
    app.run(debug=True)