import mongoose, { Document, Schema } from "mongoose";

export interface IAcademicYear extends Document {
    yearName: string;
    isActive: boolean;
}

const AcademicYearSchema = new Schema({
    yearName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const AcademicYear = mongoose.models.AcademicYear || mongoose.model<IAcademicYear>("AcademicYear", AcademicYearSchema);

export interface ISemesterType extends Document {
    typeName: string;
    description?: string;
}

const SemesterTypeSchema = new Schema({
    typeName: { type: String, required: true },
    description: { type: String },
}, { timestamps: true });

export const SemesterType = mongoose.models.SemesterType || mongoose.model<ISemesterType>("SemesterType", SemesterTypeSchema);

export interface ISemester extends Document {
    semesterNumber: number;
    academicYearId: mongoose.Types.ObjectId;
    semesterTypeId: mongoose.Types.ObjectId;
    isActive: boolean;
}

const SemesterSchema = new Schema({
    semesterNumber: { type: Number, required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    semesterTypeId: { type: Schema.Types.ObjectId, ref: "SemesterType", required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Semester = mongoose.models.Semester || mongoose.model<ISemester>("Semester", SemesterSchema);

export interface ISubject extends Document {
    subjectName: string;
    subjectCode: string;
    semesterId: mongoose.Types.ObjectId;
    credits: number;
}

const SubjectSchema = new Schema({
    subjectName: { type: String, required: true },
    subjectCode: { type: String, required: true },
    semesterId: { type: Schema.Types.ObjectId, ref: "Semester", required: true },
    credits: { type: Number, default: 3 },
}, { timestamps: true });

export const Subject = mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);
