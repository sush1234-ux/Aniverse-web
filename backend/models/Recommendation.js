const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
  characterName: { type: String, required: true },
  animeSource: { type: String, required: true },
  vibeClass: { type: String, required: true },
  themeColor: { type: String, required: true },
  recommendations: [
    {
      movieTitle: { type: String, required: true },
      genre: { type: String, required: true },
      reason: { type: String, required: true }
    }
  ]
});

module.exports = mongoose.model('Recommendation', RecommendationSchema);
