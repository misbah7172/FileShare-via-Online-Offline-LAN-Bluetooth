import QRCode from 'qrcode';

export const generateQRCode = async (text) => {
  try {
    const url = await QRCode.toDataURL(text, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return url;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('text/') || fileType.includes('document')) return '📝';
  if (fileType.includes('zip') || fileType.includes('archive')) return '📦';
  return '📁';
};

export const generateTransferId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

export const downloadFile = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const isValidRoomId = (roomId) => {
  return /^[A-F0-9]{6}$/.test(roomId);
};

export const formatTransferSpeed = (bytesPerSecond) => {
  const speed = formatFileSize(bytesPerSecond);
  return `${speed}/s`;
};

export const estimateTimeRemaining = (totalBytes, transferredBytes, bytesPerSecond) => {
  if (bytesPerSecond === 0) return 'Unknown';
  
  const remainingBytes = totalBytes - transferredBytes;
  const secondsRemaining = remainingBytes / bytesPerSecond;
  
  if (secondsRemaining < 60) {
    return `${Math.ceil(secondsRemaining)}s`;
  } else if (secondsRemaining < 3600) {
    return `${Math.ceil(secondsRemaining / 60)}m`;
  } else {
    return `${Math.ceil(secondsRemaining / 3600)}h`;
  }
};

export const validateFile = (file, maxSize = 100 * 1024 * 1024) => { // 100MB default
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${formatFileSize(maxSize)}` 
    };
  }
  
  return { valid: true };
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
