// Shrinks a phone photo before upload so it is fast and fits the server limit.
export function resizeImage(file, max = 2200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve({ image: c.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('Could not open this image'));
    img.src = url;
  });
}
