# Patient Medical Survey

## Project Structure
- Backend: Node.js/Express (serves API and React frontend)
- Frontend: React (Material-UI, TreeView, Modal, Form)
- Data: patients.xls (Excel file in project root)

## Getting Started

### 1. Install dependencies and start backend
```bash
npm install
node app.js
```

### 2. Start frontend (in /client)
```bash
cd client
npm install
npm start
```

### 3. Access the app
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. MATLAB Integration
- Use MATLAB's `web` function to open the app:
  ```matlab
  web('http://localhost:3000', '-browser')
  ```
- Both MATLAB and the app read/write `patients.xls` in the project root.
- Changes made in MATLAB or the app are reflected on reload.
