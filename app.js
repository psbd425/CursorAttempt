const express = require('express');
const cors = require('cors');
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'patients.xls');

app.use(cors());
app.use(express.json());

// Helper: Load all patient data from Excel
function loadPatients() {
  const workbook = XLSX.readFile(DATA_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

// Helper: Save all patient data to Excel
function savePatients(patients) {
  const ws = XLSX.utils.json_to_sheet(patients);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, DATA_FILE);
}

// GET /api/patients/hospitals - List all unique hospital names
app.get('/api/patients/hospitals', (req, res) => {
  try {
    const patients = loadPatients();
    const hospitals = [...new Set(patients.map(p => p.Hospital))];
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load hospitals.' });
  }
});

// GET /api/patients - List all patients grouped by hospital
app.get('/api/patients', (req, res) => {
  try {
    const patients = loadPatients();
    // Group by hospital
    const grouped = {};
    patients.forEach(p => {
      if (!grouped[p.Hospital]) grouped[p.Hospital] = [];
      grouped[p.Hospital].push(p.PatientName);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load patients.' });
  }
});

// GET /api/patient/:name - Get patient details by name
app.get('/api/patient/:name', (req, res) => {
  try {
    const patients = loadPatients();
    const patient = patients.find(p => p.PatientName === req.params.name);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load patient.' });
  }
});

// PUT /api/patient/:name - Update patient details by name
app.put('/api/patient/:name', (req, res) => {
  try {
    const patients = loadPatients();
    const idx = patients.findIndex(p => p.PatientName === req.params.name);
    if (idx === -1) return res.status(404).json({ error: 'Patient not found.' });
    // Update patient info
    patients[idx] = { ...patients[idx], ...req.body };
    savePatients(patients);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update patient.' });
  }
});

// GET /api/patients/:hospital - List all patients for a given hospital
app.get('/api/patients/:hospital', (req, res) => {
  try {
    const patients = loadPatients();
    const hospitalName = req.params.hospital;
    const filtered = patients.filter(p => p.Hospital === hospitalName).map(p => p.PatientName);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load patients for hospital.' });
  }
});

// Serve frontend (for production)
app.use(express.static(path.join(__dirname, 'client', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
}); 