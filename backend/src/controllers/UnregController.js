const PlatformReview = require("../models/PlatformReview");

exports.getPlatformReview = async (req, res) => {
    try {
    const platformreview = await PlatformReview
      .find({ isApproved: true })   // 🔥 IMPORTANT
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    res.json(platformreview);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching feedbacks");
  }
};