import os
import uuid
import json
import shutil
from flask import Flask, request, jsonify, render_template, send_from_directory, make_response
from werkzeug.utils import secure_filename

# Import forensic utility helpers
from utils.hash_helper import calculate_hashes
from utils.metadata_extractor import extract_metadata
from utils.pdf_generator import generate_forensic_report

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'forensic-extractor-default-secret-key')

# Setup Directories
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
REPORT_FOLDER = os.path.join(BASE_DIR, 'reports')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['REPORT_FOLDER'] = REPORT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB Upload Limit

# Create folders if they don't exist
for folder in [UPLOAD_FOLDER, REPORT_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Helper to check allowed files (optional, we support many types, so we handle extraction errors gracefully)
def is_allowed_file(filename):
    # We support JPG, PNG, PDF, DOCX, MP3, WAV, MP4, AVI, MKV, etc.
    allowed_exts = {
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 
        'pdf', 'docx', 
        'mp3', 'wav', 'ogg', 'flac', 'm4a',
        'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'
    }
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_exts

@app.route('/')
def index():
    """Renders the main forensic dashboard."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    """
    Handles single/bulk file uploads.
    Computes cryptographic hashes, extracts metadata, saves a JSON cache,
    and returns a structured response to the frontend.
    """
    if 'files' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
        
    uploaded_files = request.files.getlist('files')
    if not uploaded_files or uploaded_files[0].filename == '':
        return jsonify({"error": "No files selected for upload"}), 400
        
    results = []
    
    for file in uploaded_files:
        if file and file.filename:
            original_filename = secure_filename(file.filename)
            # Ensure unique filename to prevent overwriting
            file_id = uuid.uuid4().hex
            file_ext = os.path.splitext(original_filename)[1]
            saved_filename = f"{file_id}{file_ext}"
            saved_filepath = os.path.join(app.config['UPLOAD_FOLDER'], saved_filename)
            
            try:
                # 1. Save physical file for analysis
                file.save(saved_filepath)
                
                # 2. Calculate MD5 & SHA-256
                hashes = calculate_hashes(saved_filepath)
                
                # 3. Extract Metadata
                metadata = extract_metadata(saved_filepath, original_filename)
                
                if metadata:
                    # Enrich metadata structure
                    metadata["file_id"] = file_id
                    metadata["hashes"] = hashes
                    
                    # 4. Save metadata JSON cache
                    json_meta_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}_meta.json")
                    with open(json_meta_path, 'w', encoding='utf-8') as jf:
                        json.dump(metadata, jf, indent=4)
                        
                    # Return compact item details to UI (excluding heavy raw dump)
                    compact_result = {
                        "file_id": file_id,
                        "filename": original_filename,
                        "category": metadata["general"]["category"],
                        "size": metadata["general"]["size_formatted"],
                        "mime": metadata["general"]["mime_type"],
                        "md5": hashes["md5"],
                        "sha256": hashes["sha256"],
                        "uploaded_at": metadata["general"]["extracted_at"]
                    }
                    results.append(compact_result)
                else:
                    results.append({
                        "filename": original_filename,
                        "error": "Failed to analyze metadata"
                    })
            except Exception as e:
                # Cleanup if failed
                if os.path.exists(saved_filepath):
                    os.remove(saved_filepath)
                results.append({
                    "filename": original_filename,
                    "error": f"Upload/Analysis failed: {str(e)}"
                })
                
    return jsonify({"status": "success", "results": results})

@app.route('/metadata/<file_id>', methods=['GET'])
def get_metadata(file_id):
    """Retrieves full cached metadata JSON for inspector details."""
    json_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}_meta.json")
    if not os.path.exists(json_path):
        return jsonify({"error": "Metadata file not found"}), 404
        
    try:
        with open(json_path, 'r', encoding='utf-8') as jf:
            metadata = json.load(jf)
        return jsonify(metadata)
    except Exception as e:
        return jsonify({"error": f"Failed to load metadata: {str(e)}"}), 500

@app.route('/report/<file_id>', methods=['GET'])
def download_report(file_id):
    """
    Reads cached metadata, generates a PDF forensic report dynamically,
    and streams the download.
    """
    json_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}_meta.json")
    if not os.path.exists(json_path):
        return make_response("Report error: Metadata does not exist", 404)
        
    try:
        with open(json_path, 'r', encoding='utf-8') as jf:
            metadata = json.load(jf)
            
        report_filename = f"forensic_report_{file_id}.pdf"
        report_path = os.path.join(app.config['REPORT_FOLDER'], report_filename)
        
        # Call report generator
        success = generate_forensic_report(metadata, report_path)
        
        if success and os.path.exists(report_path):
            return send_from_directory(
                app.config['REPORT_FOLDER'], 
                report_filename, 
                as_attachment=True,
                download_name=f"forensic_report_{metadata['general']['filename']}.pdf"
            )
        else:
            return make_response("Failed to construct forensic PDF layout", 500)
    except Exception as e:
        return make_response(f"Internal error generating report: {str(e)}", 500)

@app.route('/clear', methods=['POST'])
def clear_all():
    """Deletes uploaded files, reports, and cached metadata to reset state."""
    errors = []
    
    # Empty uploads folder
    for item in os.listdir(app.config['UPLOAD_FOLDER']):
        item_path = os.path.join(app.config['UPLOAD_FOLDER'], item)
        try:
            if os.path.isfile(item_path):
                os.remove(item_path)
        except Exception as e:
            errors.append(str(e))
            
    # Empty reports folder
    for item in os.listdir(app.config['REPORT_FOLDER']):
        item_path = os.path.join(app.config['REPORT_FOLDER'], item)
        try:
            if os.path.isfile(item_path):
                os.remove(item_path)
        except Exception as e:
            errors.append(str(e))
            
    if errors:
        return jsonify({"status": "partial_success", "errors": errors, "message": "Cleared with some file access issues."})
    return jsonify({"status": "success", "message": "Forensic history and all analyzed files have been securely wiped."})

if __name__ == '__main__':
    # Start the Flask app
    app.run(debug=True, port=5000)
