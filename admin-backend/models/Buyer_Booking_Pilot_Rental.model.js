import mongoose from "mongoose";

const rentalSchema = new mongoose.Schema(
  {
    pilot_rental_id: {
      type: String,
      unique: true,
      required: false,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    rentalDate: { type: Date, required: true },
    rentalPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    paymentStatus: { type: String, enum: ["pending", "failed", "completed"], default: "pending" },
    pilotId:{type : String , required :true },
  },

  { timestamps: true }
);
rentalSchema.pre("save", async function (next) {
  if (this.pilot_rental_id) return next();
  try {
    const last = await this.constructor.findOne().sort({ pilot_rental_id: -1 }).select("pilot_rental_id");
    if (last?.pilot_rental_id) {
      const n = parseInt(String(last.pilot_rental_id).replace("PR", ""), 10);
      this.pilot_rental_id = `PR${Number.isFinite(n) ? n + 1 : 1}`;
    } else {
      this.pilot_rental_id = "PR1";
    }
    return next();
  } catch (err) {
    return next(err);
  }
});

rentalSchema.statics.aggregateWithPilotByRentalId = function (match = {}, sort = { createdAt: -1 }) {
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "hirepilots",
        localField: "pilotId",
        foreignField: "pilotId",
        as: "pilot",
      },
    },
    { $unwind: { path: "$pilot", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        pilot_rental_id: 1,
        name: 1,
        email: 1,
        phone: 1,
        location: 1,
        amount: 1,
        status: 1,
        rentalDate: 1,
        rentalPeriod: 1,
        paymentStatus: 1,
        createdAt: 1,
        updatedAt: 1,
        pilot: {
          pilotId: "$pilot.pilotId",
          pilotName: "$pilot.pilotName",
          phoneNumber: "$pilot.phoneNumber",
          email: "$pilot.email",
          pilotCompany: "$pilot.pilotCompany",
        },
      },
    },
    { $sort: sort },
  ];
  return this.aggregate(pipeline);
};

const PilotRental = mongoose.model("PilotRental", rentalSchema);
export default PilotRental;