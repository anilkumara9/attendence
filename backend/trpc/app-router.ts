import { z } from "zod";
import { AcademicYear, Semester, Subject } from "../models/Academic";
import AttendanceSession, { IAttendanceSession } from "../models/Attendance";
import Staff from "../models/Staff";
import { createTRPCRouter, publicProcedure } from "./trpc";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { ok: true, now: new Date().toISOString() };
  }),

  login: publicProcedure
    .input(z.object({ staffId: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const staff = await Staff.findOne({ staffId: input.staffId });
      if (!staff || !staff.isActive) {
        return { ok: false, message: "Invalid staff ID or inactive account" };
      }

      const isMatch = await staff.comparePassword(input.password);
      if (!isMatch) {
        return { ok: false, message: "Invalid password" };
      }

      staff.lastLogin = new Date();
      await staff.save();

      return {
        ok: true,
        staff: {
          id: staff._id.toString(),
          staffId: staff.staffId,
          name: staff.name,
        },
      };
    }),

  register: publicProcedure
    .input(z.object({
      staffId: z.string(),
      password: z.string(),
      name: z.string(),
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const existing = await Staff.findOne({ staffId: input.staffId });
      if (existing) {
        return { ok: false, message: "Staff ID already exists" };
      }

      const staff = new Staff(input);
      await staff.save();

      return {
        ok: true,
        staff: {
          id: staff._id.toString(),
          staffId: staff.staffId,
          name: staff.name,
        },
      };
    }),

  updatePassword: publicProcedure
    .input(z.object({
      id: z.string(),
      newPassword: z.string(),
    }))
    .mutation(async ({ input }) => {
      const staff = await Staff.findById(input.id);
      if (!staff) return { ok: false, message: "Staff not found" };

      staff.password = input.newPassword;
      await staff.save();
      return { ok: true };
    }),

  saveSession: publicProcedure
    .input(z.object({
      academicYear: z.string().optional(),
      semesterType: z.string().optional(),
      semester: z.string().optional(),
      subject: z.object({ code: z.string(), name: z.string() }).optional(),
      section: z.string().optional(),
      sessionDetails: z.string(),
      students: z.array(z.object({
        regNo: z.string(),
        studentName: z.string(),
        status: z.enum(["present", "absent"]),
      })),
      markedBy: z.string(),
    }))
    .mutation(async ({ input }) => {
      const session = new AttendanceSession({
        ...input,
        markedBy: input.markedBy,
      });
      await session.save();
      return { ok: true, sessionId: session._id.toString() };
    }),

  getSessions: publicProcedure
    .input(z.object({ markedBy: z.string().optional() }))
    .query(async ({ input }) => {
      const query = input.markedBy ? { markedBy: input.markedBy } : {};
      const sessions = await AttendanceSession.find(query).sort({ createdAt: -1 }) as IAttendanceSession[];
      return sessions.map((s: IAttendanceSession) => ({
        id: s._id.toString(),
        createdAt: s.createdAt.toISOString(),
        academicYear: s.academicYear,
        semesterType: s.semesterType,
        semester: s.semester,
        subject: s.subject,
        section: s.section,
        sessionDetails: s.sessionDetails,
        students: s.students,
      }));
    }),

  deleteSession: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await AttendanceSession.findByIdAndDelete(input.id);
      return { ok: true };
    }),

  deleteAllSessions: publicProcedure
    .input(z.object({ markedBy: z.string() }))
    .mutation(async ({ input }) => {
      await AttendanceSession.deleteMany({ markedBy: input.markedBy });
      return { ok: true };
    }),

  getYears: publicProcedure.query(async () => {
    return await AcademicYear.find({ isActive: true });
  }),

  getSemesters: publicProcedure
    .input(z.object({ typeId: z.string() }))
    .query(async ({ input }) => {
      return await Semester.find({ semesterTypeId: input.typeId, isActive: true });
    }),

  getSubjects: publicProcedure
    .input(z.object({ semesterId: z.string() }))
    .query(async ({ input }) => {
      return await Subject.find({ semesterId: input.semesterId });
    }),

  seedAcademicData: publicProcedure.mutation(async () => {
    // Basic seed data based on the plan.md requirements
    const year = await AcademicYear.findOneAndUpdate(
      { yearName: "2024-2025" },
      { yearName: "2024-2025", isActive: true },
      { upsert: true, new: true }
    );

    return { ok: true, yearId: year._id.toString() };
  }),
});

export type AppRouter = typeof appRouter;
