/** Socket.IO instance for pushing notification refresh to clients */
let ioRef = null;

function setNotificationIO(io) {
  ioRef = io;
}

function emitNotificationRefresh(userId) {
  if (!ioRef || !userId) return;
  try {
    ioRef.to(`user:${userId}`).emit('notifications:refresh', { ts: Date.now() });
  } catch (e) {
    console.error('emitNotificationRefresh error:', e);
  }
}

function emitChatUnreadRefresh(userId) {
  if (!ioRef || !userId) return;
  try {
    ioRef.to(`user:${userId}`).emit('chat:unread-refresh', { ts: Date.now() });
  } catch (e) {
    console.error('emitChatUnreadRefresh error:', e);
  }
}

module.exports = { setNotificationIO, emitNotificationRefresh, emitChatUnreadRefresh };
