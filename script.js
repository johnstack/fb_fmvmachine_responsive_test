
// Initialize video player elements
const videoPlayer = document.getElementById('video-player');
const hotspotOverlay = document.getElementById('hotspot-overlay');
const playPauseBtn = document.getElementById('play-pause');
const timelineSlider = document.getElementById('timeline-slider');
const timestampDisplay = document.getElementById('timestamp-display');

// Video data
const videoList = ["videos/moon and asteroid.mp4","videos/Sattelite.mp4","videos/Moon rover.mp4"];
const hotspotsByVideo = {"videos/moon and asteroid.mp4":[{"x":58.327911986237005,"y":50.2467358897913,"width":23.131080944326378,"height":27.96340084301429,"text":"","externalLink":"","videoLink":"videos/Sattelite.mp4","time":4.636578,"startTime":2,"endTime":10,"name":"Asteroid"}],"videos/Sattelite.mp4":[{"x":60.918593052001555,"y":49.25979233062609,"width":4.6262161888652855,"height":8.55351084609849,"text":"","externalLink":"","videoLink":"videos/Moon rover.mp4","time":0,"startTime":0,"endTime":14,"name":""}],"videos/Moon rover.mp4":[]};
const quizzesByVideo = {};
const videoOptions = {};

// Add event listeners for controls visibility
videoPlayer.addEventListener('play', updateControlsVisibility);
videoPlayer.addEventListener('pause', updateControlsVisibility);
document.getElementById('video-container').addEventListener('mousemove', updateControlsVisibility);

// State variables
let currentVideoPath = null;
let originalVideoWidth = 0;
let originalVideoHeight = 0;
let shownQuizzes = []; // Track quizzes that have been shown

let controlsTimeout;
const controlsHideDelay = 3000; // 3 seconds

// Utility functions
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes.toString().padStart(2, '0') + ":" + secs.toString().padStart(2, '0');
}

function updateTimestamp() {
    if (!videoPlayer) return;
    
    const currentTime = formatTime(videoPlayer.currentTime);
    const duration = formatTime(videoPlayer.duration);
    
    if (timestampDisplay) {
        timestampDisplay.textContent = currentTime + " / " + duration;
    }
}

function updateTimelineSlider() {
    if (!videoPlayer || !timelineSlider) return;
    if (isNaN(videoPlayer.duration) || videoPlayer.duration === 0) return;
    
    const currentTime = videoPlayer.currentTime;
    const duration = videoPlayer.duration;
    
    if (isNaN(currentTime) || isNaN(duration) || duration <= 0) {
        return;
    }
    
    if (currentTime >= 0 && currentTime < duration - 0.1) {
        const percentage = (currentTime / duration) * 100;
        if (!isNaN(percentage) && percentage >= 0 && percentage < 99.9) {
            timelineSlider.value = percentage;
        }
    } else if (currentTime <= 0.1) {
        timelineSlider.value = 0;
    }
    
    updateTimestamp();
}

function seekVideo() {
    if (!videoPlayer || !timelineSlider) return;
    if (isNaN(videoPlayer.duration) || videoPlayer.duration === 0) return;
    
    const time = (timelineSlider.value / 100) * videoPlayer.duration;
    
    if (!isNaN(time) && time >= 0 && time <= videoPlayer.duration) {
        videoPlayer.currentTime = time;
        updateTimestamp();
    }
}

function updateControlsVisibility() {
    const controls = document.getElementById('controls');
    
    if (videoPlayer.paused) {
        // Always show controls when paused
        controls.classList.add('visible');
    } else {
        // Auto-hide controls during playback
        controls.classList.remove('visible');
        
        // Clear any existing timeout
        clearTimeout(controlsTimeout);
        
        // Show controls
        controls.style.opacity = '1';
        
        // Set timeout to hide controls
        controlsTimeout = setTimeout(() => {
            controls.style.opacity = '0';
        }, controlsHideDelay);
    }
}

// Helper function to remove start message
function removeStartMessage() {
    const message = document.querySelector('.start-message');
    if (message) {
        message.style.opacity = '0';
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 500);
    }
}

function togglePlayPause() {
    removeStartMessage();
    
    if (videoPlayer.paused) {
        videoPlayer.play()
            .then(() => {
                updatePlayPauseButtonText();
            })
            .catch(error => {
                console.error('Error playing video:', error);
                updatePlayPauseButtonText();
                
                // Don't show alert for autoplay errors
                if (!error.message.includes('play method is not allowed')) {
                    alert('Error playing video: ' + error.message);
                }
            });
    } else {
        videoPlayer.pause();
        updatePlayPauseButtonText();
    }
}

function updatePlayPauseButtonText() {
    if (playPauseBtn) {
        playPauseBtn.textContent = videoPlayer.paused ? 'Play' : 'Pause';
    }
}

function handleVideoEnd() {
    const options = videoOptions[currentVideoPath] || {};
    if (options.loop) {
        videoPlayer.currentTime = 0;  // Reset to beginning
        videoPlayer.play()
            .catch(error => {
                console.error('Error looping video:', error);
                alert('Error looping video: ' + error.message);
            });
    } else if (options.playNext) {
        loadVideo(options.playNext);
    } else {
        videoPlayer.pause();
        updatePlayPauseButtonText();
    }
}

function loadVideo(videoPath) {
    try {
        if (currentVideoPath === videoPath) return;
        
        // Remove start message if it exists
        removeStartMessage();
        
        // Reset shown quizzes when changing videos
        resetShownQuizzes();
        
        currentVideoPath = videoPath;
    
        // Check if the video exists
        if (!videoPath || !videoList.includes(videoPath)) {
            console.error('Video not found:', videoPath);
            alert('Video not found: ' + videoPath);
            return;
        }
        
        videoPlayer.src = videoPath;
    
        // Set video options
        const options = videoOptions[videoPath] || {};
        videoPlayer.loop = options.loop || false;
        
        // Reset UI
        timelineSlider.value = 0;
    updateTimestamp();

        // Play the video
        videoPlayer.play()
            .then(() => {
                updatePlayPauseButtonText();
            })
            .catch(error => {
                console.error('Error playing video:', error);
                updatePlayPauseButtonText();
                    
                // Don't show alert for autoplay errors
                if (!error.message.includes('play method is not allowed')) {
                    alert('Error playing video: ' + error.message);
                }
            });

        // Update controls visibility
        updateControlsVisibility();
            
        // Clear hotspots and render new ones
        renderHotspots();
    } catch (error) {
        console.error('Error loading video:', error);
        alert('Error loading video: ' + error.message);
    }
}

function renderHotspots() {
    try {
        hotspotOverlay.innerHTML = '';
        if (currentVideoPath && hotspotsByVideo[currentVideoPath]) {
            const videoRect = videoPlayer.getBoundingClientRect();
            const videoAspectRatio = videoPlayer.videoWidth / videoPlayer.videoHeight;
            const containerAspectRatio = videoRect.width / videoRect.height;
            
            let videoDisplayWidth, videoDisplayHeight;
            
            if (containerAspectRatio > videoAspectRatio) {
                videoDisplayHeight = videoRect.height;
                videoDisplayWidth = videoDisplayHeight * videoAspectRatio;
            } else {
                videoDisplayWidth = videoRect.width;
                videoDisplayHeight = videoDisplayWidth / videoAspectRatio;
    }
            
            const offsetX = (videoRect.width - videoDisplayWidth) / 2;
            const offsetY = (videoRect.height - videoDisplayHeight) / 2;
            
            hotspotsByVideo[currentVideoPath].forEach((hotspot, index) => {
            const hotspotElement = document.createElement('div');
            hotspotElement.className = 'hotspot';
            
            // Convert percentage coordinates to pixels
                const xPixels = offsetX + (hotspot.x / 100) * videoDisplayWidth;
                const yPixels = offsetY + (hotspot.y / 100) * videoDisplayHeight;
                const widthPixels = (hotspot.width / 100) * videoDisplayWidth;
                const heightPixels = (hotspot.height / 100) * videoDisplayHeight;
            
                hotspotElement.style.left = xPixels + 'px';
                hotspotElement.style.top = yPixels + 'px';
                hotspotElement.style.width = widthPixels + 'px';
                hotspotElement.style.height = heightPixels + 'px';
            hotspotElement.dataset.index = index;

                hotspotElement.addEventListener('click', handleHotspotClick);
            hotspotOverlay.appendChild(hotspotElement);
        });
    }
    updateHotspotVisibility();
    } catch (error) {
        console.error('Error rendering hotspots:', error);
    }
}

function updateHotspotVisibility() {
    try {
    const currentTime = Math.floor(videoPlayer.currentTime);
        if (currentVideoPath && hotspotsByVideo[currentVideoPath]) {
            hotspotsByVideo[currentVideoPath].forEach((hotspot, index) => {
                const hotspotElement = hotspotOverlay.querySelector(`[data-index="${index}"]`);
            if (hotspotElement) {
                const isVisible = currentTime >= hotspot.startTime && currentTime <= hotspot.endTime;
                hotspotElement.style.display = isVisible ? 'block' : 'none';
            }
        });
    }
    } catch (error) {
        console.error('Error updating hotspot visibility:', error);
    }
}

function handleHotspotClick(event) {
    try {
        // Remove start message if it exists
        removeStartMessage();
        
        const index = event.target.dataset.index;
        const hotspot = hotspotsByVideo[currentVideoPath][index];
        if (hotspot.videoLink) {
            loadVideo(hotspot.videoLink);
        } else if (hotspot.externalLink) {
            window.open(hotspot.externalLink, '_blank');
        } else if (hotspot.text) {
            alert(hotspot.text);   
        }
    } catch (error) {
        console.error('Error handling hotspot click:', error);
        alert('Error handling hotspot: ' + error.message);
    }
}

// Quiz Functions
function resetShownQuizzes() {
    shownQuizzes = [];
}

function showQuizzesAtTime(currentTime) {
    try {
        if (!currentVideoPath) return;
        
        const quizzes = quizzesByVideo[currentVideoPath] || [];
        
        // Find quizzes at current time
        const quizzesToShow = quizzes.filter(quiz => {
            return Math.abs(quiz.time - currentTime) < 1 && !shownQuizzes.includes(quiz.id);
        });
        
        // Show quizzes
        if (quizzesToShow.length > 0) {
            videoPlayer.pause();
            updatePlayPauseButtonText();
            
            // Show first quiz
            showQuizPopup(quizzesToShow[0]);
            shownQuizzes.push(quizzesToShow[0].id);
        }
    } catch (error) {
        console.error('Error showing quizzes at time:', error);
    }
}

function showQuizPopup(quiz) {
    try {
        // Check if popup already exists
        let quizPopup = document.getElementById('quiz-popup');
        
        if (!quizPopup) {
            // Create popup
            quizPopup = document.createElement('div');
            quizPopup.id = 'quiz-popup';
            document.body.appendChild(quizPopup);
        }
        
        // Set content
        quizPopup.innerHTML = `
            <div class="quiz-popup-content">
                <h3>${quiz.question}</h3>
                <div class="quiz-popup-options">
                    ${quiz.options.map((option, index) => `
                        <button class="quiz-popup-option" data-index="${index}">${option.text}</button>
                    `).join('')}
                </div>
                <div class="quiz-popup-result" style="display: none;"></div>
                <button class="quiz-popup-continue" style="display: none;">Continue</button>
            </div>
        `;
        
        // Show popup
        quizPopup.style.display = 'flex';
        
        // Add event listeners
        const optionButtons = quizPopup.querySelectorAll('.quiz-popup-option');
        const resultDiv = quizPopup.querySelector('.quiz-popup-result');
        const continueButton = quizPopup.querySelector('.quiz-popup-continue');
        
        optionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedIndex = parseInt(button.dataset.index);
                const isCorrect = quiz.options[selectedIndex].isCorrect;
                
                // Show result
                resultDiv.style.display = 'block';
                
                if (isCorrect) {
                    resultDiv.innerHTML = '<span class="correct">✓ Correct!</span>';
                    resultDiv.style.background = 'rgba(46, 204, 113, 0.1)';
                    resultDiv.style.border = '1px solid rgba(46, 204, 113, 0.3)';
                } else {
                    resultDiv.innerHTML = '<span class="incorrect">✗ Incorrect!</span>';
                    resultDiv.style.background = 'rgba(231, 76, 60, 0.1)';
                    resultDiv.style.border = '1px solid rgba(231, 76, 60, 0.3)';
                }
                
                // Highlight correct answer
                optionButtons.forEach((btn, idx) => {
                    if (quiz.options[idx].isCorrect) {
                        btn.classList.add('correct');
                    } else if (idx === selectedIndex && !isCorrect) {
                        btn.classList.add('incorrect');
                    }
                    btn.disabled = true;
                });
                
                // Check if there's a video to play based on the answer
                const videoToPlay = isCorrect ? quiz.correctVideoLink : quiz.incorrectVideoLink;
                
                if (videoToPlay) {
                    
                    // Close the quiz popup before playing the video
                    setTimeout(() => {
                        quizPopup.style.display = 'none';
                        loadVideo(videoToPlay);
                    }, 2000); // Short delay to let the user see the result
                } else {
                    // Show continue button only if there's no video to play
                    continueButton.style.display = 'block';
                }
            });
        });
        
        continueButton.addEventListener('click', () => {
            // Hide popup with fade effect
            quizPopup.style.opacity = '0';
            quizPopup.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                quizPopup.style.display = 'none';
                quizPopup.style.opacity = '1';
                
                // Resume video
                if (videoPlayer) {
                    // Check if the video has ended
                    if (videoPlayer.currentTime >= videoPlayer.duration - 0.5) {
                        // Reset shown quizzes if the video has ended or is very close to the end
                        resetShownQuizzes();
                        handleVideoEnd();
                    } else {
                        videoPlayer.play()
                            .catch(error => {
                                console.error('Error resuming video after quiz:', error);
                            });
                        updatePlayPauseButtonText();
                    }
                }
            }, 300);
        });
    } catch (error) {
        console.error('Error showing quiz popup:', error);
        alert('Error showing quiz: ' + error.message);
    }
}

// Add hotspot-related event listeners
videoPlayer.addEventListener('loadedmetadata', () => {
    renderHotspots();
    updateTimelineSlider();
    updateTimestamp();
    
    // Set original dimensions
    originalVideoWidth = videoPlayer.videoWidth;
    originalVideoHeight = videoPlayer.videoHeight;
});

window.addEventListener('resize', renderHotspots);
timelineSlider.addEventListener('input', seekVideo);
videoPlayer.addEventListener('timeupdate', () => {
    updateTimelineSlider();
    updateHotspotVisibility();
    showQuizzesAtTime(videoPlayer.currentTime);
});
videoPlayer.addEventListener('ended', handleVideoEnd);
playPauseBtn.addEventListener('click', togglePlayPause);
videoPlayer.addEventListener('seeked', resetShownQuizzes);

// Handle fullscreen changes
document.addEventListener('fullscreenchange', () => {
    setTimeout(renderHotspots, 100); // Short delay to allow UI to update
});

// Error handling for video loading
videoPlayer.addEventListener('error', (e) => {
    console.error('Video error:', e);
    alert('Error loading video. Please try another video.');
});

// Initialize with first video if available
if (videoList.length > 0) {
    // Set source but don't autoplay
    currentVideoPath = videoList[0];
    videoPlayer.src = videoList[0];
    
    // Set video options
    const options = videoOptions[videoList[0]] || {};
    videoPlayer.loop = options.loop || false;
    
    // Update UI to show video is ready to play
    updatePlayPauseButtonText();
    
    // Add a message to inform the user to click play
    const startMessage = document.createElement('div');
    startMessage.className = 'start-message';
    startMessage.innerHTML = '<p>Click Play to start the video</p>';
    document.body.appendChild(startMessage);
    
    // Render hotspots for the initial video
    videoPlayer.addEventListener('loadedmetadata', () => {
        renderHotspots();
    }, { once: true });
} else {
    console.error('No videos available to play');
    alert('No videos available to play');
}

// Add responsive behavior
function handleResponsiveLayout() {
    const container = document.getElementById('video-container');
    if (window.innerWidth < 768) { // Mobile breakpoint
        container.classList.add('mobile-view');
    } else {
        container.classList.remove('mobile-view');
    }
    renderHotspots();
}

window.addEventListener('load', handleResponsiveLayout);
window.addEventListener('resize', handleResponsiveLayout);
