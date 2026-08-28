const db = require('../database/db');

module.exports = {
  getSticky(channelId) {
    const record = db.getSticky(channelId);
    if (!record) return null;
    return {
      content: record.content,
      lastMessageId: record.last_message_id,
      authorId: record.author_id,
      updatedAt: record.updated_at
    };
  },

  setSticky(channelId, data) {
    db.setSticky(channelId, {
      content: data.content,
      lastMessageId: data.lastMessageId || null,
      authorId: data.authorId || null
    });
  },

  updateLastMessageId(channelId, messageId) {
    db.updateStickyLastMessageId(channelId, messageId);
  },

  deleteSticky(channelId) {
    return db.deleteSticky(channelId);
  }
};
