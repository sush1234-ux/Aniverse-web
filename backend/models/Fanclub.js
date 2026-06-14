const mongoose = require('mongoose');

const FanclubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  bannerUrl: {
    type: String
  },
  associatedCharacters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Fanclub', FanclubSchema);
