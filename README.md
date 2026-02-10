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

Follow these instructions to set up, run, and build the application.

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/client) app on your Android device (for development)
- [Java Development Kit (JDK)](https://www.oracle.com/java/technologies/downloads/) (for building APKs)
- [Android Studio](https://developer.android.com/studio) (optional, for emulators)

### 1. Clone the Repository

```bash
git clone https://github.com/anilkumara9/attendence.git
cd attendence
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Backend Setup

The app requires a local backend server to function.

1.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add your machine's local IP address.
    
    *Find your local IP:*
    - **Windows:** `ipconfig` (Look for IPv4 Address, e.g., `192.168.0.x`)
    - **Mac/Linux:** `ifconfig`

    *Create `.env` file:*
    ```env
    # Replace 192.168.0.x with your actual local IP address
    EXPO_PUBLIC_API_URL=http://192.168.0.x:3000/trpc
    ```

2.  **Start the Backend Server:**
    Open a new terminal and run:
    ```bash
    npm run backend
    ```
    You should see: `🚀 Backend server is running on http://localhost:3000`

### 4. Running the App (Development)

1.  **Start Expo:**
    In a separate terminal, run:
    ```bash
    npx expo start
    ```

2.  **Run on Android:**
    - Scan the QR code with the **Expo Go** app on your Android phone.
    - Ensure your phone and computer are on the **same Wi-Fi network**.

### 5. Building the APK (Production)

To build a standalone APK file for Android:

1.  **Install EAS CLI:**
    ```bash
    npm install -g eas-cli
    ```

2.  **Login to Expo:**
    ```bash
    eas login
    ```

3.  **Configure Build:**
    Ensure `eas.json` is configured (already included in the repo).

4.  **Run Build Command:**
    ```bash
    eas build -p android --profile preview
    ```
    - This will generate an APK file that you can download and install on any Android device.
    - Follow the prompts in the terminal.

### Troubleshooting

-   **Network Request Failed:**
    -   Ensure your phone and computer are on the same Wi-Fi.
    -   Verify the IP address in `.env` matches your computer's local IP using `ipconfig`.
    -   Restart the backend (`npm run backend`) and Expo (`npx expo start --clear`) after changing `.env`.

-   **Backend Not Connecting:**
    -   Check if the backend server is running (`npm run backend`).
    -   Ensure port `3000` is allowed through your firewall if necessary.

