import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import axios from 'axios';
import DownloadIcon from '@mui/icons-material/Download';

const GENDER_OPTIONS = ["Male", "Female"];
const HEALTH_STATUS_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];
const SMOKING_OPTIONS = ["Yes", "No"];

const MATLAB_SCRIPT = `%% openPatientSurveyInMATLABOnline.m\n% Opens the Patient Medical Survey web app in a MATLAB Online uifigure\nf = uifigure('Name', 'Patient Medical Survey', 'Position', [100 100 1200 800]);\nuihtml(f, 'URL', 'https://your-app-url.com');\n`;

function downloadMATLABScript() {
  const blob = new Blob([MATLAB_SCRIPT], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'openPatientSurveyInMATLABOnline.m';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function App() {
  const [hospitals, setHospitals] = useState([]);
  const [treeChildren, setTreeChildren] = useState({}); // { hospital: [patients] }
  const [expanded, setExpanded] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState({}); // { hospital: true/false }

  useEffect(() => {
    axios.get('http://localhost:3001/api/patients/hospitals').then(res => {
      setHospitals(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      setPatientDetails(null);
      axios.get(`http://localhost:3001/api/patient/${encodeURIComponent(selectedPatient)}`)
        .then(res => {
          setPatientDetails(res.data);
          setForm(res.data);
        });
    }
  }, [selectedPatient]);

  const handlePatientSelect = (patientName) => {
    setSelectedPatient(patientName);
    setFormErrors({});
    setSaveSuccess(false);
  };

  const handleFormChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setFormErrors(e => ({ ...e, [field]: undefined }));
    setSaveSuccess(false);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.PatientName || form.PatientName.trim() === "") errors.PatientName = "Name required";
    if (!form.Age || isNaN(form.Age) || Number(form.Age) <= 0) errors.Age = "Positive number required";
    if (!GENDER_OPTIONS.includes(form.Gender)) errors.Gender = "Select Male or Female";
    if (!form.HealthStatus) errors.HealthStatus = "Required";
    if (!SMOKING_OPTIONS.includes(form.SmokingIndication)) errors.SmokingIndication = "Required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    setModalOpen(true);
  };

  const handleModalConfirm = () => {
    setModalOpen(false);
    setSaveLoading(true);
    const oldName = patientDetails.PatientName;
    const newName = form.PatientName;
    const oldHospital = patientDetails.Hospital;
    const newHospital = form.Hospital || oldHospital;
    axios.put(`http://localhost:3001/api/patient/${encodeURIComponent(oldName)}`, form)
      .then(() => {
        setSaveSuccess(true);
        setSaveLoading(false);
        // If name or hospital changed, update selection and refresh tree
        if (oldName !== newName || oldHospital !== newHospital) {
          setSelectedPatient(newName);
          setPatientDetails({ ...form });
          // Reload hospitals and clear treeChildren to force tree refresh
          axios.get('http://localhost:3001/api/patients/hospitals').then(res => {
            setHospitals(res.data);
            setTreeChildren({});
            setExpanded([]);
          });
        }
      })
      .catch(() => {
        setSaveLoading(false);
      });
  };

  // Dynamic loading: fetch patients for a hospital when expanded for the first time
  const handleItemExpansion = async (event, itemIds) => {
    setExpanded(itemIds);
    const toLoad = itemIds.filter(h => !(h in treeChildren) && !loadingPatients[h]);
    for (const hospital of toLoad) {
      setLoadingPatients(prev => ({ ...prev, [hospital]: true }));
      try {
        const res = await axios.get(`http://localhost:3001/api/patients/${encodeURIComponent(hospital)}`);
        setTreeChildren(prev => ({ ...prev, [hospital]: res.data }));
      } finally {
        setLoadingPatients(prev => ({ ...prev, [hospital]: false }));
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Top bar with button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 2, bgcolor: '#fff', borderBottom: 1, borderColor: 'divider' }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadMATLABScript}
          sx={{ textTransform: 'none' }}
        >
          Open in MATLAB Online
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Left: Tree Panel */}
        <Paper elevation={2} sx={{ width: 320, p: 2, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Patients by Hospital</Typography>
          <Divider sx={{ mb: 2 }} />
          {loading ? <CircularProgress /> : (
            <SimpleTreeView expandedItems={expanded} onExpandedItemsChange={handleItemExpansion}>
              {hospitals.map(hospital => (
                <TreeItem itemId={hospital} label={hospital} key={hospital}>
                  {treeChildren[hospital]
                    ? treeChildren[hospital].length > 0
                      ? treeChildren[hospital].map(name => (
                          <TreeItem
                            itemId={hospital + '-' + name}
                            label={name}
                            key={name}
                            onClick={() => handlePatientSelect(name)}
                          />
                        ))
                      : <TreeItem itemId={hospital + '-empty'} label={<em>No patients</em>} key={hospital + '-empty'} disabled />
                    : loadingPatients[hospital]
                      ? <TreeItem itemId={hospital + '-loading'} label={<em>Loading...</em>} key={hospital + '-loading'} disabled />
                      : <TreeItem itemId={hospital + '-placeholder'} label={<em>Expand to load</em>} key={hospital + '-placeholder'} disabled />
                  }
                </TreeItem>
              ))}
            </SimpleTreeView>
          )}
        </Paper>
        {/* Right: Patient Info Panel */}
        <Box sx={{ flex: 1, p: 4 }}>
          <Typography variant="h5" gutterBottom>Patient Medical Survey</Typography>
          <Divider sx={{ mb: 2 }} />
          {selectedPatient && patientDetails ? (
            <Box component="form" sx={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Patient Name"
                value={form.PatientName || ''}
                onChange={e => handleFormChange('PatientName', e.target.value)}
                error={!!formErrors.PatientName}
                helperText={formErrors.PatientName}
                required
                fullWidth
              />
              <TextField
                label="Age"
                type="number"
                value={form.Age || ''}
                onChange={e => handleFormChange('Age', e.target.value)}
                error={!!formErrors.Age}
                helperText={formErrors.Age}
                required
                fullWidth
                inputProps={{ min: 1 }}
              />
              <TextField
                select
                label="Gender"
                value={form.Gender || ''}
                onChange={e => handleFormChange('Gender', e.target.value)}
                error={!!formErrors.Gender}
                helperText={formErrors.Gender}
                required
                fullWidth
              >
                {GENDER_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
              <TextField
                select
                label="Health Status"
                value={form.HealthStatus || ''}
                onChange={e => handleFormChange('HealthStatus', e.target.value)}
                error={!!formErrors.HealthStatus}
                helperText={formErrors.HealthStatus}
                required
                fullWidth
              >
                {HEALTH_STATUS_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
              <TextField
                select
                label="Smoking Indication"
                value={form.SmokingIndication || ''}
                onChange={e => handleFormChange('SmokingIndication', e.target.value)}
                error={!!formErrors.SmokingIndication}
                helperText={formErrors.SmokingIndication}
                required
                fullWidth
              >
                {SMOKING_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button variant="contained" color="primary" onClick={handleSave} disabled={saveLoading}>Save</Button>
                {saveSuccess && <Typography color="success.main">Saved!</Typography>}
              </Box>
            </Box>
          ) : (
            <Typography color="text.secondary">Select a patient to view details.</Typography>
          )}
          {/* Custom Modal Confirmation Dialog */}
          <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
            <DialogTitle>Confirm Save</DialogTitle>
            <DialogContent>
              <Typography>Are you sure you want to save changes to this patient?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setModalOpen(false)} color="secondary">Cancel</Button>
              <Button onClick={handleModalConfirm} color="primary" variant="contained" disabled={saveLoading}>Confirm</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}

export default App;
