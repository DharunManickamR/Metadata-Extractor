import hashlib

def calculate_hashes(filepath):
    """
    Calculates MD5 and SHA-256 hashes of a file by reading it in chunks.
    This ensures that memory consumption remains low even for large files.
    
    Args:
        filepath (str): The absolute path to the file.
        
    Returns:
        dict: A dictionary containing 'md5' and 'sha256' hex strings.
    """
    md5_hash = hashlib.md5()
    sha256_hash = hashlib.sha256()
    
    chunk_size = 65536  # 64 KB chunks
    
    try:
        with open(filepath, 'rb') as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                md5_hash.update(chunk)
                sha256_hash.update(chunk)
                
        return {
            'md5': md5_hash.hexdigest(),
            'sha256': sha256_hash.hexdigest()
        }
    except Exception as e:
        return {
            'md5': f"Error: {str(e)}",
            'sha256': f"Error: {str(e)}"
        }
