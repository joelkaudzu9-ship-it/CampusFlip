
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  UploadCloud,
  ImagePlus,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Images,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

export default function ListingImageUploader({ listingId, onUploaded }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews(urls);

    return () => {
      urls.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  function addFiles(selectedFiles) {
    setError('');
    setMessage('');

    const selected = Array.from(selectedFiles || []);
    const valid = [];

    for (const file of selected) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Please choose JPG, PNG or WebP images.');
        continue;
      }

      if (file.size > MAX_SIZE) {
        setError(`${file.name} is larger than the 5 MB limit.`);
        continue;
      }

      valid.push(file);
    }

    setFiles(current => {
      const remaining = MAX_IMAGES - current.length;

      if (valid.length > remaining) {
        setError(`You can add only ${remaining} more image(s).`);
      }

      return [...current, ...valid].slice(0, MAX_IMAGES);
    });
  }

  function selectFiles(event) {
    addFiles(event.target.files);
    event.target.value = '';
  }

  function removeFile(index) {
    setFiles(current => current.filter((_, i) => i !== index));
    setError('');
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (!uploading) {
      addFiles(event.dataTransfer.files);
    }
  }

  async function uploadImages() {
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.');
      return;
    }

    if (!listingId) {
      setError('Create a listing before uploading its photos.');
      return;
    }

    if (!files.length) {
      setError('Choose at least one image.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');
    setMessage('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        throw new Error('Please sign in before uploading images.');
      }

      const { data: signedData, error: signError } =
        await supabase.functions.invoke('cloudinary-sign');

      if (signError) throw signError;

      if (!signedData?.signature) {
        throw new Error('Could not obtain an upload signature.');
      }

      const uploadedUrls = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();

        formData.append('file', file);
        formData.append('api_key', signedData.api_key);
        formData.append('timestamp', String(signedData.timestamp));
        formData.append('folder', signedData.folder);
        formData.append('signature', signedData.signature);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${signedData.cloud_name}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error?.message || 'Cloudinary upload failed.'
          );
        }

        uploadedUrls.push(result.secure_url);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const rows = uploadedUrls.map((url, index) => ({
        listing_id: listingId,
        image_url: url,
        display_order: index,
      }));

      const { error: databaseError } = await supabase
        .from('listing_photos')
        .insert(rows);

      if (databaseError) throw databaseError;

      setMessage(`${uploadedUrls.length} photo(s) uploaded successfully.`);
      setFiles([]);

      if (onUploaded) onUploaded(uploadedUrls);
    } catch (err) {
      console.error('Image upload error:', err);
      setError(err.message || 'Something went wrong during upload.');
    } finally {
      setUploading(false);
    }
  }

  const remaining = MAX_IMAGES - files.length;

  return (
    <section className="cf-image-uploader">
      <style>{`
        .cf-image-uploader {
          color: #10265c;
          width: 100%;
          font-family: inherit;
        }

        .cf-uploader-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 17px;
        }

        .cf-uploader-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #1769e8;
          background: #edf4ff;
        }

        .cf-uploader-heading h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 750;
        }

        .cf-uploader-heading p {
          margin: 4px 0 0;
          color: #8290a8;
          font-size: 12px;
        }

        .cf-drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 27px 15px;
          min-height: 150px;
          border: 1.5px dashed #b8ccec;
          border-radius: 17px;
          background: linear-gradient(145deg, #f7faff, #eef5ff);
          transition: all .2s ease;
          cursor: pointer;
        }

        .cf-drop-zone:hover,
        .cf-drop-zone.is-dragging {
          border-color: #1769e8;
          background: #edf4ff;
          box-shadow: 0 0 0 4px rgba(23,105,232,.07);
        }

        .cf-drop-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: white;
          color: #1769e8;
          box-shadow: 0 5px 18px rgba(16,38,92,.08);
          margin-bottom: 12px;
        }

        .cf-drop-zone strong {
          font-size: 14px;
          font-weight: 750;
        }

        .cf-drop-zone small {
          color: #8290a8;
          font-size: 11px;
          margin-top: 6px;
        }

        .cf-choose-button {
          margin-top: 14px;
          border: 0;
          border-radius: 10px;
          padding: 10px 17px;
          background: #1769e8;
          color: white;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 5px 13px rgba(23,105,232,.18);
          transition: transform .2s, background .2s;
        }

        .cf-choose-button:hover {
          background: #1058cb;
          transform: translateY(-1px);
        }

        .cf-photo-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 18px 0 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .cf-photo-toolbar span:last-child {
          color: #8b99ad;
          font-weight: 500;
        }

        .cf-photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          gap: 10px;
        }

        .cf-photo-card {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1;
          border-radius: 13px;
          background: #edf2fa;
          border: 1px solid #e1e8f2;
        }

        .cf-photo-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .cf-photo-remove {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: rgba(16,38,92,.85);
          color: white;
          cursor: pointer;
          backdrop-filter: blur(8px);
        }

        .cf-photo-number {
          position: absolute;
          bottom: 6px;
          left: 6px;
          padding: 4px 7px;
          border-radius: 6px;
          background: rgba(16,38,92,.78);
          color: white;
          font-size: 10px;
        }

        .cf-upload-progress {
          margin-top: 17px;
        }

        .cf-progress-track {
          height: 7px;
          overflow: hidden;
          background: #e9eff8;
          border-radius: 20px;
          margin-top: 8px;
        }

        .cf-progress-fill {
          height: 100%;
          border-radius: 20px;
          background: linear-gradient(90deg, #1769e8, #64b5f6);
          transition: width .25s ease;
        }

        .cf-upload-status {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          margin-top: 14px;
          padding: 11px 13px;
          border-radius: 10px;
        }

        .cf-upload-status.success {
          color: #147a50;
          background: #ecfdf5;
        }

        .cf-upload-status.error {
          color: #bd3434;
          background: #fff1f1;
        }

        .cf-upload-submit {
          width: 100%;
          margin-top: 17px;
          padding: 13px 17px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 12px;
          background: #1769e8;
          color: white;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 7px 18px rgba(23,105,232,.17);
          transition: all .2s ease;
        }

        .cf-upload-submit:hover:not(:disabled) {
          background: #1058cb;
          transform: translateY(-1px);
        }

        .cf-upload-submit:disabled {
          opacity: .48;
          cursor: not-allowed;
          box-shadow: none;
        }

        .cf-uploader-footer {
          display: flex;
          justify-content: center;
          gap: 6px;
          align-items: center;
          margin-top: 12px;
          color: #94a0b2;
          font-size: 10px;
        }

        @media (max-width: 420px) {
          .cf-drop-zone {
            padding: 22px 10px;
          }
        }
      `}</style>

      <div className="cf-uploader-heading">
        <div className="cf-uploader-icon">
          <Images size={21} />
        </div>
        <div>
          <h3>Listing photos</h3>
          <p>Make your listing stand out.</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        disabled={uploading || remaining <= 0}
        onChange={selectFiles}
      />

      <div
        className={`cf-drop-zone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragging(false);
          }
        }}
        onDrop={handleDrop}
        onClick={() => {
          if (!uploading && remaining > 0) inputRef.current?.click();
        }}
        role="button"
        tabIndex={uploading || remaining <= 0 ? -1 : 0}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!uploading && remaining > 0) inputRef.current?.click();
          }
        }}
        aria-label="Choose or drop listing photos"
        aria-disabled={uploading || remaining <= 0}
      >
        <div className="cf-drop-icon">
          <UploadCloud size={25} />
        </div>

        <strong>
          {dragging ? 'Drop your photos here' : 'Drop your photos here'}
        </strong>
        <small>or choose images from your device</small>

        <button
          type="button"
          className="cf-choose-button"
          disabled={uploading || remaining <= 0}
          onClick={event => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <ImagePlus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Choose photos
        </button>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <div className="cf-photo-toolbar">
              <span>Selected photos</span>
              <span>{files.length} / {MAX_IMAGES}</span>
            </div>

            <div className="cf-photo-grid">
              {previews.map((item, index) => (
                <motion.div
                  className="cf-photo-card"
                  key={`${item.file.name}-${index}`}
                  layout
                  initial={{ opacity: 0, scale: .85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: .85 }}
                >
                  <img src={item.url} alt={item.file.name} />

                  <span className="cf-photo-number">
                    Photo {index + 1}
                  </span>

                  <button
                    type="button"
                    className="cf-photo-remove"
                    disabled={uploading}
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X size={15} />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {uploading && (
        <div className="cf-upload-progress">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            fontWeight: 700,
          }}>
            <span>Uploading your photos...</span>
            <span>{progress}%</span>
          </div>
          <div className="cf-progress-track">
            <div
              className="cf-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="cf-upload-status error" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {message && (
        <div className="cf-upload-status success" role="status">
          <CheckCircle2 size={16} />
          {message}
        </div>
      )}

      <button
        type="button"
        className="cf-upload-submit"
        onClick={uploadImages}
        disabled={uploading || files.length === 0}
      >
        {uploading ? (
          <>
            <LoaderCircle size={17} className="cf-spin" />
            Uploading photos...
          </>
        ) : (
          <>
            <UploadCloud size={17} />
            Upload {files.length ? `${files.length} photo(s)` : 'photos'}
          </>
        )}
      </button>

      <div className="cf-uploader-footer">
        <CheckCircle2 size={12} />
        JPG, PNG or WebP · Up to 5 MB each · Maximum 5 photos
      </div>
    </section>
  );
}
