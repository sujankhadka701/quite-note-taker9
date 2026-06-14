# quick-note-taker

## 5.1 Group Information

| Full Name       | Student ID | Role                                              |
| --------------- | ---------- | ------------------------------------------------- |
| Bina Rai        | 2024791109 | Developed PDF Export Feature and Direct Print Feature; contributed to Bold, Italic, and Underline Formatting          |
| Sujan Khadka    | 2024791078 |developed Direct Print Feature and developed Restore and Permanently Delete Feature; contributed to Bold, Italic, and Underline Formatting |
| Prakriti Basnet | 2024891031 | Contributed to Bold, Italic, and Underline Formatting                              |
| Pramod Gurung   | __________ | Contributed to Bold, Italic, and Underline Formatting                             |
| Prabin Dhimal   | __________ | Contributed to Bold, Italic, and Underline Formatting                             |

**Group Work:** The features assigned in the classroom project were completed collaboratively by all group members.

---

## 5.2 App Description

Quick Note Taker is an Electron-based desktop application that allows users to create, edit, organize, and manage notes efficiently. Users can format text, restore deleted notes, permanently remove unwanted notes, print notes, and export notes as PDF documents. The application provides a simple and user-friendly interface for note management.

---



## 5.3 New Features Added

### 1. Export to PDF

**Built By:** Bina Rai

**Description:**
Allows users to export notes as PDF documents for sharing, printing, and offline storage.

**Files Modified:**

* `renderer.js` (Export PDF button and functionality)
* `preload.js` (`exportPDF` API bridge)
* `main.js` (PDF generation and save dialog handling)

---

### 2. Direct Print

**Built By:** Bina Rai and Sujan Khadka

**Description:**
Allows users to print notes directly from the application without exporting them first.

**Files Modified:**

* `index.html` (Print Note button)
* `renderer.js` (Print button event handling)
* `preload.js` (`printNote` API bridge)
* `main.js` (Print functionality)

---

### 3. Text Formatting (Bold, Italic, and Underline)

**Built By:** Bina Rai, Sujan Khadka, Prakriti Basnet, Pramod Gurung, and Prabin Dhimal

**Description:**
Allows users to format selected text using bold, italic, and underline styles to improve note readability and organization.

**Files Modified:**

* `index.html` (Formatting toolbar buttons)
* `renderer.js` (Bold, Italic, and Underline actions)

---

### 4. Restore and Permanently Delete Notes

**Built By:** Sujan Khadka

**Description:**
Allows users to restore deleted notes from the Trash Bin or permanently delete them when no longer needed.

**Files Modified:**

* `index.html` (Trash Bin interface and restore/delete controls)
* `renderer.js` (Restore, trash management, and permanent delete functionality)
* `main.js` (Note storage and deletion handling)


## 5.4 How to Run the App

Follow these steps to run the application from the source code:

### Step 1: Install Node.js

Download and install Node.js from:

https://nodejs.org

After installation, verify it is installed correctly by opening a terminal and running:

```bash
node -v
npm -v
```

### Step 2: Open the Project Folder

Open a terminal (Command Prompt, PowerShell, or VS Code Terminal) and navigate to the project folder:

```bash
cd path/to/Quick-Note-Taker
```

### Step 3: Install Dependencies

Install all required packages listed in `package.json`:

```bash
npm install
```

Wait until the installation process is completed.

### Step 4: Start the Application

Run the Electron application using:

```bash
npm start
```

### Step 5: Use the Application

Once the application launches:

* Create and edit notes.
* Format text using Bold, Italic, and Underline.
* Organize notes using categories.
* Print notes directly.
* Export notes as PDF files.
* Restore deleted notes from the Trash Bin.
* Permanently delete unwanted notes.

The Quick Note Taker application is now ready to use.

5. The application will launch automatically.

---

## 5.5 How to Install the App

### Windows

## Windows

1. Navigate to the `dist/` folder after building the application.
2. Double-click the generated `.exe` file.
3. If an installer window appears, follow the on-screen installation instructions.
4. If the application opens directly, it is a portable version and no installation is required.
5. Launch Quick Note Taker from the Desktop shortcut, Start Menu, or by opening the portable `.exe` file.

### Build the Installer (For Developers)

Run the following command:

```bash
npm run dist
```

This will generate the packaged application inside the `dist/` folder.
