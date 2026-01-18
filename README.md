# MyClass Attendance App

A modern Expo application for tracking student attendance with offline-first capabilities, tRPC backend integration, and PDF report generation.

## Features

- **Auth Gate**: Secure staff login with inactivity timeout.
- **Academic Context**: Select year, semester, and subject.
- **Import/Export**: Import students from Excel, export reports to PDF.
- **Offline Safe**: Data persists locally with `AsyncStorage`.
- **tRPC Integration**: Ready for backend synchronization.

## Project Structure

- `app/`: Expo Router file-based navigation.
- `backend/`: Hono + tRPC server logic.
- `providers/`: Context providers for Auth, Attendance, and tRPC.
- `components/`: UI components.
- `constants/`: Theme and color constants.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
