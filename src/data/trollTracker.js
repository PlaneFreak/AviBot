// In-memory tracker for playful photo troll feature
const activeTrolls = new Map(); // userId -> { expiresAt, lastCommentIndex }

const FUNNY_PHOTO_COMMENTS = [
  'Did you take this photo with a toaster while running away from airport security? 🏃‍♂️💨',
  'That landing looks so rough even Ryanair is taking notes on how to bounce harder. 🛬💥',
  'I’ve seen smoother landings from a bowling ball dropped out of a helicopter. 🎳🚁',
  'Spirit Airlines just saw this picture and offered you a job as their lead flight attendant. ✈️💅',
  'My Wi-Fi signal has fewer dropouts than the shutter stability on this shot. 📶💀',
  'Did you shoot this on a Nintendo DS through someone else’s dirty sunglasses? 🕶️🎮',
  'Boeing called: they want to know if this photo is responsible for their recent turbulence data. 📉😂',
  'The pilot must have been playing Flappy Bird on the primary flight display during this approach. 🐦🕹️',
  'Even the pigeons on runway 27L are gathered around laughing at this angle right now. 🐦📸',
  'Bro took a photo in 4K: 4 pixels and Karamba. 🥔✨',
  'Is that an airplane or a weather balloon having an existential mid-air crisis? 🎈🛸',
  'Someone please check the cabin pressure, because this photo just sucked all the oxygen out of the room. 💨🤣',
  'I don’t know what’s shaking more, the engines on takeoff or the photographer’s hands. 📳🌪️',
  'That aircraft is leaning harder than my sleep schedule on a Sunday night. 😴✈️',
  'Air Traffic Control called: they are requesting you delete this before the radar crashes. 📻🚨',
  'This looks like what happens when you let a Golden Retriever fly Microsoft Flight Simulator on keyboard controls. 🐶🎮',
  'NASA just detected this upload from space and classified it as an unidentified flying comedy. 🛸🪐',
  'If I had a nickel for every blurry pixel here, I could buy my own private Airbus A380. 🪙🛫',
  'Looks like someone buttered the runway with olive oil before snapping this pic. 🧈🍳',
  'The camera autofocus fought for its life on this one and lost in the first round. 🥊📷'
];

module.exports = {
  addTroll(userId, durationMs = 10 * 60 * 1000) {
    const expiresAt = Date.now() + durationMs;
    activeTrolls.set(userId, { expiresAt, lastCommentIndex: -1 });
    setTimeout(() => {
      activeTrolls.delete(userId);
    }, durationMs);
    return expiresAt;
  },

  isTrolled(userId) {
    const troll = activeTrolls.get(userId);
    if (!troll) return false;
    if (Date.now() > troll.expiresAt) {
      activeTrolls.delete(userId);
      return false;
    }
    return true;
  },

  removeTroll(userId) {
    return activeTrolls.delete(userId);
  },

  getRandomComment(userId) {
    const troll = activeTrolls.get(userId);
    const lastIndex = troll ? troll.lastCommentIndex : -1;

    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * FUNNY_PHOTO_COMMENTS.length);
    } while (newIndex === lastIndex && FUNNY_PHOTO_COMMENTS.length > 1);

    if (troll) {
      troll.lastCommentIndex = newIndex;
    }

    return FUNNY_PHOTO_COMMENTS[newIndex];
  }
};
