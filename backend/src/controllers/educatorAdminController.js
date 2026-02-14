const EducatorAdmin = require('../models/EducatorAdmin');

// @desc    Get all educator admins with pagination
// @route   GET /api/educator-admins
const getEducatorAdmins = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const admins = await EducatorAdmin.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await EducatorAdmin.countDocuments();

    res.json({
      success: true,
      data: admins,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Search educator admins
// @route   GET /api/educator-admins/search
const searchEducatorAdmins = async (req, res) => {
  try {
    const { query } = req.query;
    
    const searchCriteria = query
      ? {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { institution: { $regex: query, $options: 'i' } },
          ],
        }
      : {};

    const admins = await EducatorAdmin.find(searchCriteria).limit(20);
    
    res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single educator admin
// @route   GET /api/educator-admins/:id
const getEducatorAdmin = async (req, res) => {
  try {
    const admin = await EducatorAdmin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create educator admin
// @route   POST /api/educator-admins
const createEducatorAdmin = async (req, res) => {
  try {
    const admin = await EducatorAdmin.create(req.body);
    res.status(201).json({ success: true, data: admin });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update educator admin
// @route   PUT /api/educator-admins/:id
const updateEducatorAdmin = async (req, res) => {
  try {
    const admin = await EducatorAdmin.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Suspend educator admin
// @route   PATCH /api/educator-admins/:id/suspend
const suspendEducatorAdmin = async (req, res) => {
  try {
    const admin = await EducatorAdmin.findByIdAndUpdate(
      req.params.id,
      { status: 'SUSPENDED' },
      { new: true }
    );
    
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Reactivate educator admin
// @route   PATCH /api/educator-admins/:id/reactivate
const reactivateEducatorAdmin = async (req, res) => {
  try {
    const admin = await EducatorAdmin.findByIdAndUpdate(
      req.params.id,
      { status: 'ACTIVE' },
      { new: true }
    );
    
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete educator admin
// @route   DELETE /api/educator-admins/:id
const deleteEducatorAdmin = async (req, res) => {
  try {
    const admin = await EducatorAdmin.findByIdAndDelete(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getEducatorAdmins,
  searchEducatorAdmins,
  getEducatorAdmin,
  createEducatorAdmin,
  updateEducatorAdmin,
  suspendEducatorAdmin,
  reactivateEducatorAdmin,
  deleteEducatorAdmin,
};