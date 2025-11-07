import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import connectDB from './config/db';
import userRoutes from './routes/userRoutes';
import vendorRoutes from './routes/vendorRoutes';
import skuRoutes from './routes/skuRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import promoRoutes from './routes/promoRoutes';
import orderRoutes from './routes/orderRoutes';
import pickupRoutes from './routes/pickupRoutes';
import damageRoutes from './routes/damageRoutes';
import paymentRoutes from './routes/paymentRoutes';
import uploadRoutes from './routes/uploadRoutes';
import locationRoutes from './routes/locationRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import traderRoutes from './routes/user/traderRoutes';
import websiteSectionRoutes from './routes/user/websiteSectionRoutes';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

const PORT = process.env.PORT || 5000;

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/damage', damageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('api/health', (_req, res) => res.send('OK'));
app.use('/api/traders', traderRoutes);
app.use('/api/website-sections', websiteSectionRoutes);

app.get('/', (_req, res) => res.send('Keshav Admin API running'));

app.use((err: any, _req: express.Request, res: express.Response, _next: any) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server Error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));