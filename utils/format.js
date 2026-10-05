/** แปลงขนาดไฟล์ (bytes) เป็นข้อความ เช่น 1.2 MB */
function formatSize(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

module.exports = { formatSize };
