import bcrypt from "bcryptjs";
import mongoose, { Document, Schema } from "mongoose";

export interface IStaff extends Document {
    staffId: string;
    name: string;
    email: string;
    password: string;
    role: "instructor" | "admin";
    isActive: boolean;
    lastLogin?: Date;
    comparePassword: (password: string) => Promise<boolean>;
}

const StaffSchema: Schema = new Schema(
    {
        staffId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["instructor", "admin"], default: "instructor" },
        isActive: { type: Boolean, default: true },
        lastLogin: { type: Date },
    },
    { timestamps: true }
);

StaffSchema.pre<IStaff>("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

StaffSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
};

export default mongoose.models.Staff || mongoose.model<IStaff>("Staff", StaffSchema);
