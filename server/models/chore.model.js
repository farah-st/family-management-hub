import mongoose from "mongoose";

const recurrenceSchema = new mongoose.Schema(
  {
    freq: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY"],
    },
    byDay: [Number],
    interval: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: true },
    dueDate: { type: Date },
    recurrence: recurrenceSchema,
    points: { type: Number, default: 0 },
  },
  { _id: false }
);


const completionSchema = new mongoose.Schema(
  {
    on: { type: Date, required: true },
    memberId: { type: String },
    paid: { type: Boolean, default: false }, // << ensure this exists
  },
  { _id: false }
);


// Inline "assigned to" info (name + role)
const assignedToSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true }, // e.g. "Sofía"
    role: { type: String, trim: true }, // e.g. "Child", "Mom", "Dad"
  },
  { _id: false }
);

const choreSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    notes: { type: String },
    priority: {
      type: String,
      enum: ["low", "med", "high"],
      default: "med",
    },
    dueDate: { type: Date },

    // Monetary reward for completing this chore
    rewardAmount: {
      type: Number,
      default: 0,
    },
    rewardCurrency: {
      type: String,
      default: "USD",
      trim: true,
      uppercase: true, // ensure ISO-style codes like "USD", "MXN"
    },

    // Existing richer structure
    assignments: {
      type: [assignmentSchema],
      default: [],
    },
    completed: {
      type: [completionSchema],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },

    // Single assigned member with name + role
    assignedTo: {
      type: assignedToSchema,
      default: undefined, // field optional for older docs
    },

    // Legacy fields
    assignee: String,
    categoryId: String,
  },
  { timestamps: true }
);

const Chore = mongoose.model("Chore", choreSchema);

export default Chore;
