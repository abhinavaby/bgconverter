/* ============================================================================
   MonoVision - Image to Black & White Converter
   Production-Ready JavaScript with Canvas Processing
   ============================================================================ */

// ============================================================================
// Application State and Configuration
// ============================================================================

const APP_CONFIG = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    canvas: {
        maxWidth: 2000,
        maxHeight: 2000
    },
    notifications: {
        duration: 4000
    }
};

// Application state
const appState = {
    originalImage: null,
    originalCanvas: null,
    convertedCanvas: null,
    isProcessing: false,
    currentFileName: null,
    fileData: {
        name: null,
        size: null,
        dimensions: null
    }
};

// ============================================================================
// DOM Elements Reference
// ============================================================================

const DOM = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    fileDimensions: document.getElementById('fileDimensions'),
    previewSection: document.getElementById('previewSection'),
    actionSection: document.getElementById('actionSection'),
    originalCanvas: document.getElementById('originalCanvas'),
    convertedCanvas: document.getElementById('convertedCanvas'),
    convertBtn: document.getElementById('convertBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    resetBtn: document.getElementById('resetBtn'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    notificationContainer: document.getElementById('notificationContainer'),
    currentYear: document.getElementById('currentYear')
};

// ============================================================================
// File Validation and Processing
// ============================================================================

/**
 * Validates if the file is a supported image format
 * @param {File} file - File to validate
 * @returns {Object} - {valid: boolean, error: string|null}
 */
function validateFile(file) {
    // Check file size
    if (file.size > APP_CONFIG.maxFileSize) {
        return {
            valid: false,
            error: `File size exceeds ${(APP_CONFIG.maxFileSize / 1024 / 1024).toFixed(0)}MB limit`
        };
    }

    // Check file type
    if (!APP_CONFIG.allowedFormats.includes(file.type)) {
        return {
            valid: false,
            error: 'Only JPG, JPEG, PNG, and WEBP formats are supported'
        };
    }

    return { valid: true, error: null };
}

/**
 * Formats file size into human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Updates file information display
 * @param {File} file - The uploaded file
 * @param {HTMLImageElement} img - The loaded image element
 */
function updateFileInfo(file, img) {
    appState.fileData.name = file.name;
    appState.fileData.size = file.size;
    appState.fileData.dimensions = `${img.naturalWidth} × ${img.naturalHeight}px`;

    DOM.fileName.textContent = file.name;
    DOM.fileSize.textContent = formatFileSize(file.size);
    DOM.fileDimensions.textContent = appState.fileData.dimensions;

    DOM.fileInfo.style.display = 'grid';
}

/**
 * Handles file selection and processing
 * @param {File} file - The selected file
 */
function handleFileUpload(file) {
    try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            showNotification(validation.error, 'error');
            return;
        }

        // Store current file name
        appState.currentFileName = file.name;

        // Create FileReader to read the file
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const img = new Image();
                img.onload = () => {
                    // Validate image dimensions
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                        throw new Error('Invalid image dimensions');
                    }

                    // Store original image
                    appState.originalImage = img;
                    updateFileInfo(file, img);

                    // Draw original image on canvas
                    drawOriginalImage(img);

                    // Show preview and action sections
                    DOM.previewSection.style.display = 'block';
                    DOM.actionSection.style.display = 'block';
                    DOM.convertBtn.style.display = 'inline-flex';
                    DOM.downloadBtn.style.display = 'none';

                    // Reset converted canvas
                    const ctx = DOM.convertedCanvas.getContext('2d', { willReadFrequently: true });
                    ctx.clearRect(0, 0, DOM.convertedCanvas.width, DOM.convertedCanvas.height);

                    showNotification('Image loaded successfully!', 'success');
                };

                img.onerror = () => {
                    throw new Error('Failed to load image. The file may be corrupted.');
                };

                img.src = e.target.result;
            } catch (error) {
                handleError('Image processing failed', error);
            }
        };

        reader.onerror = () => {
            handleError('File reading failed', new Error('Could not read the file'));
        };

        reader.readAsDataURL(file);
    } catch (error) {
        handleError('File upload error', error);
    }
}

// ============================================================================
// Canvas Drawing and Image Processing
// ============================================================================

/**
 * Draws the original image on the original canvas
 * @param {HTMLImageElement} img - The image to draw
 */
function drawOriginalImage(img) {
    try {
        const canvas = DOM.originalCanvas;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Calculate dimensions maintaining aspect ratio
        const maxWidth = 600;
        const maxHeight = 400;
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        const aspectRatio = width / height;
        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Clear and draw image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Store canvas reference
        appState.originalCanvas = canvas;
    } catch (error) {
        handleError('Failed to draw original image', error);
    }
}

/**
 * Applies grayscale filter to the image using Canvas API
 * Uses the formula: Gray = (Red × 0.299) + (Green × 0.587) + (Blue × 0.114)
 */
function convertToGrayscale() {
    return new Promise((resolve, reject) => {
        try {
            if (!appState.originalImage) {
                throw new Error('No image loaded');
            }

            // Show loading spinner
            DOM.loadingSpinner.style.display = 'flex';
            appState.isProcessing = true;

            // Process in next frame to avoid blocking UI
            requestAnimationFrame(() => {
                try {
                    const canvas = DOM.convertedCanvas;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });

                    // Use original canvas dimensions
                    const width = appState.originalCanvas.width;
                    const height = appState.originalCanvas.height;

                    canvas.width = width;
                    canvas.height = height;

                    // Copy image data from original canvas
                    ctx.drawImage(appState.originalImage, 0, 0, width, height);

                    // Get image data
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;

                    // Apply grayscale conversion using optimized loop
                    // Process 4 bytes at a time (RGBA)
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];

                        // Grayscale formula (standard luminosity formula)
                        const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);

                        // Set all RGB channels to gray value
                        data[i] = gray;       // Red
                        data[i + 1] = gray;   // Green
                        data[i + 2] = gray;   // Blue
                        // data[i + 3] unchanged (Alpha channel)
                    }

                    // Put modified image data back on canvas
                    ctx.putImageData(imageData, 0, 0);

                    // Hide loading spinner
                    DOM.loadingSpinner.style.display = 'none';
                    appState.isProcessing = false;

                    // Show download button
                    DOM.downloadBtn.style.display = 'inline-flex';

                    showNotification('Image converted to black & white successfully!', 'success');
                    resolve();
                } catch (error) {
                    DOM.loadingSpinner.style.display = 'none';
                    appState.isProcessing = false;
                    reject(error);
                }
            });
        } catch (error) {
            DOM.loadingSpinner.style.display = 'none';
            appState.isProcessing = false;
            reject(error);
        }
    });
}

// ============================================================================
// Download Functionality
// ============================================================================

/**
 * Downloads the converted image as PNG
 */
function downloadImage() {
    try {
        if (!DOM.convertedCanvas) {
            throw new Error('No converted image available');
        }

        const link = document.createElement('a');
        const filename = appState.currentFileName
            ? appState.currentFileName.replace(/\.[^/.]+$/, '_bw.png')
            : 'converted_bw.png';

        link.href = DOM.convertedCanvas.toDataURL('image/png');
        link.download = filename;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification(`Image downloaded as ${filename}`, 'success');
    } catch (error) {
        handleError('Download failed', error);
    }
}

// ============================================================================
// Drag and Drop Handling
// ============================================================================

/**
 * Sets up drag and drop event listeners
 */
function setupDragAndDrop() {
    const uploadArea = DOM.uploadArea;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        }, false);
    });

    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    }, false);
}

// ============================================================================
// Event Listeners Setup
// ============================================================================

/**
 * Sets up all event listeners for the application
 */
function setupEventListeners() {
    // Upload area click
    DOM.uploadArea.addEventListener('click', () => {
        DOM.fileInput.click();
    });

    // File input change
    DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Convert button
    DOM.convertBtn.addEventListener('click', async () => {
        if (appState.isProcessing) {
            showNotification('Processing is already in progress...', 'info');
            return;
        }

        try {
            DOM.convertBtn.disabled = true;
            await convertToGrayscale();
        } catch (error) {
            handleError('Conversion failed', error);
        } finally {
            DOM.convertBtn.disabled = false;
        }
    });

    // Download button
    DOM.downloadBtn.addEventListener('click', () => {
        downloadImage();
    });

    // Reset button
    DOM.resetBtn.addEventListener('click', () => {
        resetApplication();
    });

    // Setup drag and drop
    setupDragAndDrop();

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });
}

// ============================================================================
// Notification System
// ============================================================================

/**
 * Shows a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - Type of notification: 'success', 'error', 'info'
 */
function showNotification(message, type = 'info') {
    try {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');

        // Create icon based on type
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>`;
        } else if (type === 'error') {
            iconSvg = `<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`;
        } else {
            iconSvg = `<svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`;
        }

        notification.innerHTML = `
            ${iconSvg}
            <span>${message}</span>
            <button class="notification-close" aria-label="Close notification" onclick="this.parentElement.style.animation='slideInLeft 0.3s ease-out reverse'; setTimeout(() => this.parentElement.remove(), 300)">
                ×
            </button>
        `;

        DOM.notificationContainer.appendChild(notification);

        // Auto-remove after duration
        const timeout = setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideInLeft 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, APP_CONFIG.notifications.duration);

        // Allow manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(timeout);
        });
    } catch (error) {
        console.error('Failed to show notification:', error);
    }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Centralized error handling
 * @param {string} title - Error title
 * @param {Error} error - Error object
 */
function handleError(title, error) {
    console.error(title, error);
    showNotification(`${title}: ${error.message}`, 'error');
}

// ============================================================================
// Reset Application
// ============================================================================

/**
 * Resets the application to initial state
 */
function resetApplication() {
    try {
        // Clear image data
        appState.originalImage = null;
        appState.originalCanvas = null;
        appState.convertedCanvas = null;
        appState.currentFileName = null;
        appState.fileData = {
            name: null,
            size: null,
            dimensions: null
        };

        // Clear canvases
        let ctx = DOM.originalCanvas.getContext('2d');
        ctx.clearRect(0, 0, DOM.originalCanvas.width, DOM.originalCanvas.height);
        DOM.originalCanvas.width = 0;
        DOM.originalCanvas.height = 0;

        ctx = DOM.convertedCanvas.getContext('2d');
        ctx.clearRect(0, 0, DOM.convertedCanvas.width, DOM.convertedCanvas.height);
        DOM.convertedCanvas.width = 0;
        DOM.convertedCanvas.height = 0;

        // Reset file input
        DOM.fileInput.value = '';

        // Hide sections
        DOM.fileInfo.style.display = 'none';
        DOM.previewSection.style.display = 'none';
        DOM.actionSection.style.display = 'none';
        DOM.loadingSpinner.style.display = 'none';

        // Reset button states
        DOM.convertBtn.style.display = 'inline-flex';
        DOM.convertBtn.disabled = false;
        DOM.downloadBtn.style.display = 'none';

        showNotification('Application reset. Ready for new upload.', 'success');
    } catch (error) {
        handleError('Reset failed', error);
    }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initializes the application
 */
function initializeApplication() {
    try {
        // Set current year in footer
        DOM.currentYear.textContent = new Date().getFullYear();

        // Setup event listeners
        setupEventListeners();

        console.log('✓ MonoVision application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showNotification('Application initialization failed. Please refresh the page.', 'error');
    }
}

// ============================================================================
// Startup
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    initializeApplication();
}

// ============================================================================
// Performance Monitoring (Optional)
// ============================================================================

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    // Clear image data
    appState.originalImage = null;
    appState.originalCanvas = null;
    appState.convertedCanvas = null;
});
