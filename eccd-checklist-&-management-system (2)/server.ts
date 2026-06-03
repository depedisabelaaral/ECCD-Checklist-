
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'db.json');

// Initial data structure
const initialData = {
  profiles: [],
  learners: [],
  assessments: [],
  messages: [],
  submissions: [],
  progressReports: []
};

// Helper to read/write data
const getData = () => {
  if (!fs.existsSync(DATA_FILE)) {
    const data = { ...initialData };
    // Add default admin
    data.profiles.push({
      id: 'u-admin',
      username: 'admin',
      password: 'password',
      fullName: 'System Administrator',
      designation: 'Administrator',
      role: 'ADMIN',
      status: 'APPROVED',
      lastActive: Date.now()
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  if (!data.progressReports) {
    data.progressReports = [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
  if (data.profiles.length === 0) {
    data.profiles.push({
      id: 'u-admin',
      username: 'admin',
      password: 'password',
      fullName: 'System Administrator',
      designation: 'Administrator',
      role: 'ADMIN',
      status: 'APPROVED',
      lastActive: Date.now()
    });
    saveData(data);
  }
  return data;
};

const saveData = (data: any) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));

  // API Routes
  app.get('/api/profiles', (req, res) => {
    const data = getData();
    res.json(data.profiles);
  });

  app.get('/api/profiles/:id', (req, res) => {
    const data = getData();
    const profile = data.profiles.find((p: any) => p.id === req.params.id);
    if (profile) res.json(profile);
    else res.status(404).json({ error: 'Not found' });
  });

  app.post('/api/profiles', (req, res) => {
    const data = getData();
    const existingIndex = data.profiles.findIndex((p: any) => p.id === req.body.id);
    if (existingIndex >= 0) {
      data.profiles[existingIndex] = { ...data.profiles[existingIndex], ...req.body };
    } else {
      data.profiles.push(req.body);
    }
    saveData(data);
    res.json({ success: true });
  });

  app.patch('/api/profiles/:id', (req, res) => {
    const data = getData();
    const index = data.profiles.findIndex((p: any) => p.id === req.params.id);
    if (index >= 0) {
      data.profiles[index] = { ...data.profiles[index], ...req.body };
      saveData(data);
      res.json(data.profiles[index]);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  app.get('/api/learners', (req, res) => {
    const data = getData();
    res.json(data.learners);
  });

  app.post('/api/learners', (req, res) => {
    const data = getData();
    const existingIndex = data.learners.findIndex((l: any) => l.id === req.body.id);
    if (existingIndex >= 0) {
      data.learners[existingIndex] = { ...data.learners[existingIndex], ...req.body };
    } else {
      data.learners.push(req.body);
    }
    saveData(data);
    res.json({ success: true });
  });

  app.delete('/api/learners/:id', (req, res) => {
    const data = getData();
    data.learners = data.learners.filter((l: any) => l.id !== req.params.id);
    data.assessments = data.assessments.filter((a: any) => a.learnerId !== req.params.id);
    saveData(data);
    res.json({ success: true });
  });

  app.get('/api/assessments', (req, res) => {
    const data = getData();
    res.json(data.assessments);
  });

  app.post('/api/assessments', (req, res) => {
    const data = getData();
    const existingIndex = data.assessments.findIndex((a: any) => a.id === req.body.id);
    if (existingIndex >= 0) {
      data.assessments[existingIndex] = { ...data.assessments[existingIndex], ...req.body };
    } else {
      data.assessments.push(req.body);
    }
    saveData(data);
    res.json({ success: true });
  });

  app.delete('/api/assessments/:id', (req, res) => {
    const data = getData();
    data.assessments = data.assessments.filter((a: any) => a.id !== req.params.id);
    saveData(data);
    res.json({ success: true });
  });

  app.get('/api/progress-reports', (req, res) => {
    const data = getData();
    res.json(data.progressReports || []);
  });

  app.post('/api/progress-reports', (req, res) => {
    const data = getData();
    if (!data.progressReports) data.progressReports = [];
    const index = data.progressReports.findIndex((p: any) => p.id === req.body.id || (p.learnerId === req.body.learnerId && p.schoolYear === req.body.schoolYear));
    if (index >= 0) {
      data.progressReports[index] = { ...data.progressReports[index], ...req.body };
    } else {
      data.progressReports.push({
        ...req.body,
        id: req.body.id || `pr-${Date.now()}`
      });
    }
    saveData(data);
    res.json({ success: true, progressReport: req.body });
  });

  app.delete('/api/progress-reports/:id', (req, res) => {
    const data = getData();
    if (data.progressReports) {
      data.progressReports = data.progressReports.filter((p: any) => p.id !== req.params.id);
      saveData(data);
    }
    res.json({ success: true });
  });

  app.get('/api/messages', (req, res) => {
    const data = getData();
    res.json(data.messages);
  });

  app.post('/api/messages', (req, res) => {
    const data = getData();
    data.messages.push(req.body);
    saveData(data);
    res.json({ success: true });
  });

  app.patch('/api/messages/read', (req, res) => {
    const { ids } = req.body;
    const data = getData();
    data.messages = data.messages.map((m: any) => 
      ids.includes(m.id) ? { ...m, read: true } : m
    );
    saveData(data);
    res.json({ success: true });
  });

  // Auth Mock
  app.post('/api/auth/signin', (req, res) => {
    const { username, password } = req.body;
    const data = getData();
    const user = data.profiles.find((p: any) => p.username === username && p.password === password);
    if (user) {
      res.json({ user });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/auth/signup', (req, res) => {
    const data = getData();
    const user = { 
      ...req.body, 
      id: `u-${Date.now()}`,
      status: 'PENDING',
      lastActive: Date.now()
    };
    data.profiles.push(user);
    saveData(data);
    res.json({ user });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
