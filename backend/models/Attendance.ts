import mongoose, { Document, Schema } from "mongoose";

export interface IAttendanceRecord {
    regNo: string;
    studentName: string;
    status: "present" | "absent";
}

export interface IAttendanceSession extends Document {
    academicYear?: string;
    semesterType?: string;
    semester?: string;
    subject?: {
        code: string;
        name: string;
    };
    section?: string;
    sessionDetails: string;
    students: IAttendanceRecord[];
    markedBy: mongoose.Types.ObjectId;
    isOfflineCreated: boolean;
    deviceInfo?: {
        deviceId?: string;
        location?: {
            lat: number;
            lng: number;
        };
    };
    createdAt: Date;
}

const AttendanceSessionSchema = new Schema({
    academicYear: { type: String, required: false },
    semesterType: { type: String, required: false },
    semester: { type: String, required: false },
    subject: {
        name: { type: String, required: false },
    },
    section: { type: String, required: false },
    sessionDetails: { type: String, required: false },
    students: [{
        regNo: { type: String, required: true },
        studentName: { type: String, required: true },
        status: { type: String, enum: ["present", "absent"], required: true },
    }],
    markedBy: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    isOfflineCreated: { type: Boolean, default: false },
    deviceInfo: {
        deviceId: { type: String },
        location: {
            lat: { type: Number },
            lng: { type: Number },
        },
    },
}, { timestamps: true });

export default mongoose.models.AttendanceSession || mongoose.model<IAttendanceSession>("AttendanceSession", AttendanceSessionSchema);
