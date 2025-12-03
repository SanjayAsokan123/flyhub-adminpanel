
import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({
  jobId: {
    type: String,
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  resumeUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});



jobApplicationSchema.index({ email: 1, jobId: 1 });

export default mongoose.model('JobApplication', jobApplicationSchema);
