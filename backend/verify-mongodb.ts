import connectToDatabase from "./lib/mongodb";
import { AcademicYear } from "./models/Academic";
import AttendanceSession from "./models/Attendance";
import Staff from "./models/Staff";

async function verify() {
    console.log("🚀 Starting MongoDB Verification...");

    try {
        const db = await connectToDatabase();
        console.log("✅ MongoDB Connected Successfully!");
        console.log(`📡 Database Name: ${db.connection.db?.databaseName}`);

        // 1. Check Staff Collection
        const staffCount = await Staff.countDocuments();
        console.log(`👥 Staff count: ${staffCount}`);

        // 2. Check Academic Data
        const yearCount = await AcademicYear.countDocuments();
        console.log(`📅 Academic years count: ${yearCount}`);

        // 3. Check Attendance Data
        const sessionCount = await AttendanceSession.countDocuments();
        console.log(`📝 Attendance sessions count: ${sessionCount}`);

        console.log("\n✨ Verification Complete!");
    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

verify();
