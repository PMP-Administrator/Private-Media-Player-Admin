const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from both root and ADMIN_PAGE directory
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'ADMIN_PAGE')));

// Ensure required directories exist
const accountsDir = path.join(__dirname, 'accounts');
if (!fs.existsSync(accountsDir)) fs.mkdirSync(accountsDir, { recursive: true });

const mediaDir = path.join(__dirname, 'VIDEOFILES');
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

// --- AES-256-CBC ENCRYPTION CONFIGURATION ---
const ENCRYPTION_KEY = crypto.scryptSync('VaultplaySecretPassphrase2026', 'salt', 32); 
const IV_LENGTH = 16;

function encryptFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);

    writeStream.write(iv);
    readStream.pipe(cipher).pipe(writeStream);

    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err) => reject(err));
    readStream.on('error', (err) => reject(err));
  });
}

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => cb(null, 'temp-' + Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: tempStorage });

// --- DIRECTORY / PAGE ROUTING ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ADMIN_PAGE', 'ADMIN-SIGN-IN.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'ADMIN_PAGE', 'ADMIN-SIGN-IN.html'));
});

const otpStore = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'PMP.OTP.AUTH@gmail.com',
    pass: 'tpaq cvvn oxci iacr'
  }
});

function verifyCredentialsFromFiles(inputEmail, inputPassword) {
  if (!fs.existsSync(accountsDir)) return null;

  for (const file of fs.readdirSync(accountsDir)) {
    if (file.endsWith('.txt') || file.endsWith('.vlt')) {
      const content = fs.readFileSync(path.join(accountsDir, file), 'utf8');
      const accountData = {};
      content.split(/\r?\n/).forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) accountData[key.trim().toLowerCase()] = value.trim();
      });

      if (accountData.email?.toLowerCase() === inputEmail.toLowerCase() && accountData.password === inputPassword) {
        return { fileName: file, email: accountData.email, role: accountData.role || 'user' };
      }
    }
  }
  return null;
}

// --- OTP AUTHENTICATION ENDPOINTS ---

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expiresAt: Date.now() + 1 * 60 * 1000, isAdmin: false };

  try {
    await transporter.sendMail({
      from: '"Vaultplay Security" <noreply@vaultplay.com>',
      to: email,
      subject: 'Your Verification Code',
      text: `Your OTP code is ${otp}. It will expire in 1 minute.`
    });
    res.json({ message: 'OTP sent successfully!' });
  } catch (error) {
    console.error('Nodemailer Error:', error);
    res.status(500).json({ error: 'Failed to send OTP email.' });
  }
});

app.post('/admin-send-otp', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const matchedAccount = verifyCredentialsFromFiles(email, password);
  if (!matchedAccount) return res.status(401).json({ error: 'Invalid email or password.' });
  if (matchedAccount.role !== 'admin') return res.status(403).json({ error: 'Access denied. Account is not registered as an Administrator.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expiresAt: Date.now() + 1 * 60 * 1000, isAdmin: true, vaultFile: matchedAccount.fileName };

  try {
    await transporter.sendMail({
      from: '"Vaultplay Admin Security" <noreply@vaultplay.com>',
      to: email,
      subject: 'Vaultplay Admin Access Code',
      text: `Your Administrator OTP code is ${otp}. It will expire in 1 minute.`
    });
    res.json({ message: 'Admin authenticated! OTP sent to email.' });
  } catch (error) {
    console.error('Nodemailer Error:', error);
    res.status(500).json({ error: 'Failed to deliver Admin OTP email.' });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ error: 'No OTP requested for this email.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ error: 'OTP has expired.' });
  }

  if (record.otp === otp) {
    const isAdmin = record.isAdmin;
    delete otpStore[email];
    return res.json({ success: true, isAdmin, message: 'OTP verified successfully!' });
  }

  res.status(400).json({ error: 'Invalid OTP.' });
});

// --- ACCOUNT MANAGER ENDPOINTS ---

app.get('/admin/accounts', (req, res) => {
  if (!fs.existsSync(accountsDir)) return res.json([]);

  const files = fs.readdirSync(accountsDir).filter(f => f.endsWith('.txt') || f.endsWith('.vlt'));
  const accounts = files.map(file => {
    const content = fs.readFileSync(path.join(accountsDir, file), 'utf8');
    const data = {};
    content.split(/\r?\n/).forEach(l => {
      const [k, v] = l.split('=');
      if (k && v) data[k.trim().toLowerCase()] = v.trim();
    });
    return { fileName: file, email: data.email || 'N/A', role: data.role || 'user' };
  });

  res.json(accounts);
});

app.post('/admin/accounts', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const targetRole = (role === 'admin') ? 'admin' : 'user';

  let index = 1;
  let fileName = `${targetRole}-${index}.txt`;
  while (fs.existsSync(path.join(accountsDir, fileName))) {
    index++;
    fileName = `${targetRole}-${index}.txt`;
  }

  const filePath = path.join(accountsDir, fileName);
  const fileContent = `email=${email}\npassword=${password}\nrole=${targetRole}`;

  fs.writeFileSync(filePath, fileContent, 'utf8');
  res.json({ message: `Account created successfully as ${fileName}!` });
});

app.delete('/admin/accounts/:fileName', (req, res) => {
  const filePath = path.join(accountsDir, req.params.fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ message: 'Account file deleted.' });
  }
  res.status(404).json({ error: 'Account file not found.' });
});

// --- VIDEO FILE MANAGER ENDPOINTS (AES-256 ENCRYPTED) ---

app.get('/admin/videos', (req, res) => {
  if (!fs.existsSync(mediaDir)) return res.json([]);

  const files = fs.readdirSync(mediaDir)
    .filter(file => file.endsWith('.enc'))
    .map(file => {
      const stats = fs.statSync(path.join(mediaDir, file));
      return { name: file, size: stats.size };
    });

  res.json(files);
});

app.post('/admin/videos/upload', (req, res) => {
  upload.single('video')(req, res, async (err) => {
    if (err) {
      console.error('Multer Upload Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload video file.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const tempFilePath = req.file.path;
    const cleanOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const encryptedFileName = `${Date.now()}-${cleanOriginalName}.enc`;
    const encryptedFilePath = path.join(mediaDir, encryptedFileName);

    try {
      await encryptFile(tempFilePath, encryptedFilePath);
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      res.json({ message: `Video uploaded & encrypted as ${encryptedFileName}!` });
    } catch (encryptError) {
      console.error('Encryption Error:', encryptError);
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      res.status(500).json({ error: 'Failed to encrypt uploaded video file.' });
    }
  });
});

app.delete('/admin/videos/:filename', (req, res) => {
  const filePath = path.join(mediaDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ message: 'Encrypted video file deleted.' });
  }
  res.status(404).json({ error: 'Video file not found.' });
});

app.get('/video/:filename', (req, res) => {
  const filePath = path.join(mediaDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Encrypted video file not found.' });
  }

  const readStream = fs.createReadStream(filePath, { start: 0, end: 15 });
  
  readStream.on('data', (iv) => {
    if (iv.length < IV_LENGTH) return res.status(500).json({ error: 'Corrupted encrypted file.' });

    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const encryptedContentStream = fs.createReadStream(filePath, { start: 16 });

    res.setHeader('Content-Type', 'video/mp4');
    encryptedContentStream.pipe(decipher).pipe(res);
  });
});

app.listen(3000, () => console.log('Admin Server running on http://localhost:4000'));