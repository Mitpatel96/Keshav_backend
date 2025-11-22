import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import http from 'http';
import connectDB from './config/db';
import { handleStripeWebhook } from './controllers/paymentController';
import { initializeSocket } from './services/socketService';
import userRoutes from './routes/userRoutes';
import vendorRoutes from './routes/vendorRoutes';
import skuRoutes from './routes/skuRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import promoRoutes from './routes/promoRoutes';
import orderRoutes from './routes/orderRoutes';
import cartRoutes from './routes/cartRoutes';
import pickupRoutes from './routes/pickupRoutes';
import damageRoutes from './routes/damageRoutes';
import paymentRoutes from './routes/paymentRoutes';
import uploadRoutes from './routes/uploadRoutes';
import locationRoutes from './routes/locationRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import traderRoutes from './routes/user/traderRoutes';
import websiteSectionRoutes from './routes/user/websiteSectionRoutes';
import userSideRoutes from './routes/user/userSideRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import warehouseTimingRoutes from './routes/warehouseTimingRoutes';

dotenv.config();
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.post('/api/payment/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json());

const PORT = process.env.PORT || 5000;

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/damage', damageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user-side', userSideRoutes);
app.use('/api/traders', traderRoutes);
app.use('/api/website-sections', websiteSectionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/warehouse-timings', warehouseTimingRoutes);
app.use('api/health', (_req, res) => res.send('OK'));

app.get('/', (_req, res) => res.send('Keshav Admin API running'));

app.use((err: any, _req: express.Request, res: express.Response, _next: any) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server Error' });
});

const httpServer = http.createServer(app);
initializeSocket(httpServer);

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));