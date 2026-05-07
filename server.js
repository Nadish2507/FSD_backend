import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';



dotenv.config();

const app = express();

app.use(cors({
  origin: ['https://fsd-frontend-g2y3.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);



const PORT = process.env.PORT || 5000;

// Database Connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('ERROR: MONGO_URI is not defined in environment variables!');
} else {
  mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));
}

// Basic Route
app.get('/', (req, res) => {
  res.send('Student Project Collaboration API is running...');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
