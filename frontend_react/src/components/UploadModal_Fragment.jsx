
{/* Upload Modal */ }
{
    showUploadModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="card"
                style={{ width: '90%', maxWidth: '400px', padding: '24px', background: 'white' }}
            >
                <h3>Upload Patient Report</h3>
                <form onSubmit={handleUpload}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Select File</label>
                        <input type="file" name="report" accept="image/*,.pdf" required style={{ width: '100%' }} />
                        <p style={{ fontSize: '12px', color: '#8E8E93', marginTop: '4px' }}>Supports Images & PDF. AI Analysis will be performed automatically.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={() => setShowUploadModal(false)}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#F2F2F7', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#007AFF', color: 'white', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}
                        >
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
