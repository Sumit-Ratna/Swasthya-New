const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

exports.generatePrescriptionPDF = async (data, outputPath) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Ensure directory exists
            ensureDirectoryExists(path.dirname(outputPath));

            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // --- HEADER ---
            doc.fontSize(20).font('Helvetica-Bold').text(data.hospitalName || 'HealthNexus Clinic', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(data.doctorName, { align: 'center' });
            doc.text(data.doctorSpecialization || 'General Physician', { align: 'center' });
            doc.moveDown();
            doc.strokeColor('#000000').lineWidth(2).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            // Patient Details Table-like
            const startY = doc.y;
            const col1 = 50;
            const col2 = 200;
            const col3 = 350;
            const col4 = 450;

            doc.fontSize(10).font('Helvetica-Bold');

            // Row 1
            doc.text('Name:', col1, startY);
            doc.font('Helvetica').text(data.patientName, col2, startY);
            doc.font('Helvetica-Bold').text('Date:', col3, startY);
            doc.font('Helvetica').text(new Date().toLocaleDateString(), col4, startY);

            // Row 2
            doc.moveDown(0.5);
            const row2Y = doc.y;
            doc.font('Helvetica-Bold').text('Age/Gender:', col1, row2Y);
            doc.font('Helvetica').text(`${data.patientAge || 'N/A'} / ${data.patientGender || 'N/A'}`, col2, row2Y);
            doc.font('Helvetica-Bold').text('CR No:', col3, row2Y);
            doc.font('Helvetica').text(data.crNo || 'N/A', col4, row2Y); // Visit ID or similar

            // Row 3
            doc.moveDown(0.5);
            const row3Y = doc.y;
            doc.font('Helvetica-Bold').text('Mobile No:', col1, row3Y);
            doc.font('Helvetica').text(data.patientPhone, col2, row3Y);
            doc.font('Helvetica-Bold').text('Department:', col3, row3Y);
            doc.font('Helvetica').text('General - GDMO', col4, row3Y);

            doc.moveDown(1);
            doc.strokeColor('#000000').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(2);

            // --- CLINICAL DATA ---
            if (data.symptoms) {
                doc.font('Helvetica-Bold').fontSize(12).text('CHIEF COMPLAINT:', { continued: true });
                doc.font('Helvetica').fontSize(11).text(`  ${data.symptoms}`);
                doc.moveDown(0.5);
            }

            if (data.diagnosis) {
                doc.font('Helvetica-Bold').fontSize(12).text('DIAGNOSIS:', { continued: true });
                doc.font('Helvetica').fontSize(11).text(`  ${data.diagnosis}`);
                doc.moveDown(1.5);
            }

            // --- RX (MEDICINES) ---
            if (data.medicines && data.medicines.length > 0) {
                doc.font('Helvetica-Bold').fontSize(14).text('Rx :');
                doc.moveDown(0.5);

                let index = 1;
                data.medicines.forEach(med => {
                    // text like: 1. PARACETAMOL 650 MG ORAL TABLET, Single Tab, BD, 3 Days
                    // If med is string (legacy), print it. Ideally object.

                    let medText = '';
                    if (typeof med === 'string') {
                        medText = med;
                    } else {
                        // Constructed text
                        medText = `${med.name.toUpperCase()} ${med.dosage || ''}`;
                        if (med.frequency) medText += `, ${med.frequency}`;
                        if (med.duration) medText += `, ${med.duration}`;
                    }

                    doc.font('Helvetica').fontSize(11).text(`${index}. ${medText}`, { indent: 10 });
                    index++;
                    doc.moveDown(0.4);
                });
                doc.moveDown(1.5);
            }

            // --- FOLLOW UP ---
            if (data.notes) {
                doc.font('Helvetica-Bold').fontSize(12).text('FOLLOW UP / NOTES :');
                doc.font('Helvetica').fontSize(11).text(data.notes);
                doc.moveDown(2);
            }

            // --- FOOTER & QR ---
            const footerY = 700; // Fixed absolute position for bottom

            // Signature
            doc.fontSize(10).font('Helvetica-Bold').text('Signature of Consultant / Resident :', 50, footerY);
            doc.font('Helvetica').text(`DR. ${data.doctorName.toUpperCase()}`, 50, footerY + 15);
            doc.text(new Date().toLocaleString(), 50, footerY + 30);

            // QR Code
            try {
                // QR contains simple verify link or ID
                const qrData = `VERIFY:${data.visitId}`;
                const qrDataUrl = await QRCode.toDataURL(qrData);
                const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
                doc.image(qrBuffer, 450, 680, { width: 80 });
            } catch (err) {
                console.error("QR Gen Error", err);
            }

            doc.end();

            stream.on('finish', () => resolve(outputPath));
            stream.on('error', reject);

        } catch (err) {
            reject(err);
        }
    });
};
