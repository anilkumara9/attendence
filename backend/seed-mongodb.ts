import connectToDatabase from "./lib/mongodb";
import { AcademicYear, Semester, SemesterType, Subject } from "./models/Academic";
import Staff from "./models/Staff";

async function seed() {
    console.log("🌱 Starting Database Seeding...");

    try {
        await connectToDatabase();

        // 1. Seed Academic Year
        const year = await AcademicYear.findOneAndUpdate(
            { yearName: "2024-2025" },
            { yearName: "2024-2025", isActive: true },
            { upsert: true, new: true }
        );
        console.log(`✅ Seeded Academic Year: ${year.yearName}`);

        // 2. Seed Semester Types
        const oddType = await SemesterType.findOneAndUpdate(
            { typeName: "Odd Semester" },
            { typeName: "Odd Semester", isActive: true },
            { upsert: true, new: true }
        );
        const evenType = await SemesterType.findOneAndUpdate(
            { typeName: "Even Semester" },
            { typeName: "Even Semester", isActive: true },
            { upsert: true, new: true }
        );
        console.log("✅ Seeded Semester Types");

        // 3. Seed Semesters for 2024-2025
        const sem1 = await Semester.findOneAndUpdate(
            { semesterNumber: 1, academicYearId: year._id },
            { semesterNumber: 1, academicYearId: year._id, semesterTypeId: oddType._id, isActive: true },
            { upsert: true, new: true }
        );
        const sem2 = await Semester.findOneAndUpdate(
            { semesterNumber: 2, academicYearId: year._id },
            { semesterNumber: 2, academicYearId: year._id, semesterTypeId: evenType._id, isActive: true },
            { upsert: true, new: true }
        );
        console.log("✅ Seeded Semesters 1 & 2");

        // 4. Seed Subjects for Semester 1
        const subjects = [
            { code: "CS101", name: "Introduction to Computing" },
            { code: "CS102", name: "Data Structures" },
            { code: "CS103", name: "Digital Logic Design" },
        ];

        for (const sub of subjects) {
            await Subject.findOneAndUpdate(
                { subjectCode: sub.code, semesterId: sem1._id },
                { subjectName: sub.name, subjectCode: sub.code, semesterId: sem1._id },
                { upsert: true }
            );
        }
        console.log("✅ Seeded Subjects for Semester 1");

        // 5. Seed a Demo Staff (Optional, but useful for initial login)
        const existingStaff = await Staff.findOne({ staffId: "1001" });
        if (!existingStaff) {
            await Staff.create({
                staffId: "1001",
                name: "Default Admin",
                email: "admin@myclass.edu",
                password: "password",
                role: "admin",
                isActive: true
            });
            console.log("✅ Seeded Default Staff (1001 / password)");
        }

        console.log("\n✨ Seeding Complete!");
    } catch (error) {
        console.error("❌ Seeding Failed:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

seed();
