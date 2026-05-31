# Digital Forensics Metadata Extractor

A modern, high-tech, responsive web application for digital forensics investigators and security analysts to analyze files, extract deep embedded metadata, calculate cryptographic chain-of-custody signatures, and compile professional PDF integrity reports.

---

## Key Features

*   **Multi-Format Analysis**: Supports Images (`JPG`, `PNG`, `GIF`, `BMP`, `WEBP`), Documents (`PDF`, `DOCX`), Audio (`MP3`, `WAV`, `OGG`, `FLAC`), and Video (`MP4`, `AVI`, `MKV`, `MOV`, `WMV`, `FLV`).
*   **Deep Embedded Extraction**: Parses EXIF tags (camera, lens, shutter speed), GPS coordinates (converts DMS to decimal degrees and provides a Google Maps locator), PDF specifications (pages, creator, dates), Word properties (word counts, revision, author), and media metrics (bitrate, codecs, resolution, duration).
*   **Cryptographic Signatures**: Streams file blocks to calculate secure **MD5** and **SHA-256** checksums, establishing file authenticity and integrity.
*   **Forensic PDF Reports**: Generates professional, legal-ready PDF forensic investigation reports dynamically with clear integrity seals, metadata grids, and case details.
*   **Premium Interactive UI**: Cyber-forensic dark-mode dashboard (with a light theme toggle) designed with smooth glassmorphism, concurrent bulk upload progress queues, real-time searchable/filterable log tables, and a slide-out Inspector Drawer with organized tabs and raw JSON code styling.

---

## Directory Structure

```text
d:\Metadata-Extractor\
│
├── app.py                      # Flask Server Core & Routing
├── requirements.txt            # Python Dependencies List
├── README.md                   # This Documentation Guide
│
├── utils/                      # Core Investigative Modules
│   ├── hash_helper.py          # Streams files to compute MD5 / SHA-256 hashes
│   ├── metadata_extractor.py   # Specialized multi-format metadata parses
│   └── pdf_generator.py        # ReportLab PDF Forensic Report builder
│
├── templates/                  # Jinja2 Layout HTML Templates
│   └── index.html              # Main Dashboard Portal
│
├── static/                     # Web Assets
│   ├── css/
│   │   └── style.css           # Premium responsive style-sheet
│   └── js/
│       └── app.js              # State engine, Drag-and-Drop, AJAX uploads, Drawer
│
├── uploads/                    # Temporary uploaded files and JSON cache (gitignored)
└── reports/                    # Generated forensic reports repository (gitignored)
```

---

## Installation & Setup

Ensure you have **Python 3.10+** installed on your system.

1.  **Navigate to the project root directory**:
    ```bash
    cd d:\Metadata-Extractor
    ```

2.  **Install the required python packages**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Launch the Web Application**:
    ```bash
    python app.py
    ```

4.  **Open in your browser**:
    Navigate to `http://127.0.0.1:5000/` inside your browser to start extracting metadata.

---

## Forensic Integrity Protocol

This portal computes file signatures block-by-block immediately upon arrival. 
*   **MD5** and **SHA-256** signatures serve as unique identifiers for the uploaded file content.
*   The generated **Forensic Report** locks in these values along with system timestamps to serve as an immutable piece of digital evidence.
*   Clicking **Secure Wipe** inside the dashboard deletes all uploaded files, reports, and JSON cache records from the server storage, ensuring strict confidentiality and data clearance.
