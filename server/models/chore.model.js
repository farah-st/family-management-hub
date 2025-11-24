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
    memberId: String,
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
    assignee: String,
    categoryId: String,
  },
  { timestamps: true }
);

const Chore = mongoose.model("Chore", choreSchema);

export default Chore;