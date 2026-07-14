require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');

connectDB();

const app = express();

// --- Security & core middleware ---
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running.' }));

// --- Optionally serve the static frontend from the same server ---
// Uncomment if you want Express to also host the /client files (single-server deploy).
// app.use(express.static(path.join(__dirname, '..', 'client')));
// app.get('*', (req, res, next) => {
//   if (req.path.startsWith('/api')) return next();
//   res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
// });

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Makhana Shop API running on port ${PORT}`));
