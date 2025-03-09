document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const gestureToggle = document.getElementById('gestureToggle');
    const gestureGuide = document.getElementById('gestureGuide');
    const closeButtons = document.querySelectorAll('.close');
    const uploadForm = document.getElementById('uploadForm');
    const progressBar = document.getElementById('uploadProgress');
    const progress = progressBar.querySelector('.progress');
    const videoList = document.getElementById('videoList');
    const mainVideo = document.getElementById('mainVideo');
    const gestureOverlay = document.getElementById('gestureOverlay');

    let gestureControlEnabled = false;

    // Modal handling
    uploadBtn.addEventListener('click', () => {
        uploadModal.style.display = 'block';
        // Reset form and progress bar when opening modal
        uploadForm.reset();
        progressBar.style.display = 'none';
        progress.style.width = '0%';
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Gesture control toggle
    gestureToggle.addEventListener('click', async () => {
        try {
            const response = await fetch('/toggle_gesture_control', {
                method: 'POST'
            });
            const data = await response.json();
            gestureControlEnabled = data.enabled;
            
            if (gestureControlEnabled) {
                gestureToggle.classList.add('gesture-active');
                gestureToggle.textContent = 'Disable Gesture Control';
                gestureGuide.style.display = 'block';
                gestureOverlay.style.display = 'block';
            } else {
                gestureToggle.classList.remove('gesture-active');
                gestureToggle.textContent = 'Enable Gesture Control';
                gestureOverlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error toggling gesture control:', error);
            alert('Failed to toggle gesture control. Please try again.');
        }
    });

    // Video upload handling
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        const videoFile = document.getElementById('videoFile').files[0];
        
        if (!videoFile) {
            alert('Please select a video file');
            return;
        }

        // Validate file type
        const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        if (!validTypes.includes(videoFile.type)) {
            alert('Please select a valid video file (MP4, WebM, or OGG)');
            return;
        }

        // Validate file size (max 16MB)
        if (videoFile.size > 16 * 1024 * 1024) {
            alert('File size must be less than 16MB');
            return;
        }

        formData.append('video', videoFile);
        progressBar.style.display = 'block';
        const uploadButton = uploadForm.querySelector('button[type="submit"]');
        uploadButton.disabled = true;
        uploadButton.textContent = 'Uploading...';

        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progress.style.width = percentComplete + '%';
                }
            };

            xhr.onload = function() {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        // Create video thumbnail
                        const videoItem = createVideoItem(response.filename);
                        videoList.appendChild(videoItem);
                        uploadModal.style.display = 'none';
                        uploadForm.reset();
                    } else {
                        alert('Upload failed: ' + response.error);
                    }
                } else {
                    const response = JSON.parse(xhr.responseText);
                    alert('Upload failed: ' + (response.error || 'Unknown error'));
                }
            };

            xhr.onerror = function() {
                alert('Upload failed. Please check your connection and try again.');
            };

            xhr.onloadend = function() {
                progressBar.style.display = 'none';
                progress.style.width = '0%';
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload';
            };

            xhr.open('POST', '/upload', true);
            xhr.send(formData);
        } catch (error) {
            console.error('Error uploading video:', error);
            alert('Upload failed. Please try again.');
            progressBar.style.display = 'none';
            progress.style.width = '0%';
            uploadButton.disabled = false;
            uploadButton.textContent = 'Upload';
        }
    });

    function createVideoItem(filename) {
        const div = document.createElement('div');
        div.className = 'video-item';
        
        // Create thumbnail using the first frame of the video
        const video = document.createElement('video');
        video.src = `/uploads/${filename}`;
        video.addEventListener('loadeddata', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            const thumbnail = document.createElement('img');
            thumbnail.src = canvas.toDataURL();
            div.appendChild(thumbnail);
        });

        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = filename.split('.')[0];
        div.appendChild(title);

        // Play video on click
        div.addEventListener('click', () => {
            mainVideo.src = `/uploads/${filename}`;
            mainVideo.play();
        });

        return div;
    }

    // Keyboard shortcuts for video control
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName !== 'INPUT') {
            switch(e.key) {
                case ' ':
                    if (mainVideo.paused) mainVideo.play();
                    else mainVideo.pause();
                    break;
                case 'ArrowLeft':
                    mainVideo.currentTime -= 10;
                    break;
                case 'ArrowRight':
                    mainVideo.currentTime += 10;
                    break;
                case 'ArrowUp':
                    mainVideo.volume = Math.min(1, mainVideo.volume + 0.1);
                    break;
                case 'ArrowDown':
                    mainVideo.volume = Math.max(0, mainVideo.volume - 0.1);
                    break;
            }
        }
    });
});
