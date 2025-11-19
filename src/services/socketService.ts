import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Vendor from '../models/Vendor';

let io: SocketIOServer | null = null;

// Initialize Socket.IO server
export const initializeSocket = (httpServer: HTTPServer) => {
    // Get allowed origins from environment or allow all
    const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
        : '*';

    io = new SocketIOServer(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'], // Support both transports
        allowEIO3: true, // Allow Engine.IO v3 clients
        pingTimeout: 60000, // 60 seconds
        pingInterval: 25000, // 25 seconds
        connectTimeout: 45000, // 45 seconds
    });

    console.log('Socket.IO server initialized');
    console.log('Allowed origins:', allowedOrigins);

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        console.log('Transport:', socket.conn.transport.name);

        // Handle connection errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // Handle authentication - client should emit 'authenticate' with user info
        // For vendors, userId can be either user._id or vendor._id
        // If user._id is provided, we'll look up the vendor by permanentId
        socket.on('authenticate', async (data: { userId: string; role: string; permanentId?: string }) => {
            socket.data.userId = data.userId;
            socket.data.role = data.role;

            // Join role-based rooms
            if (data.role === 'admin') {
                socket.join('admin');
                console.log(`Admin ${data.userId} connected`);
            } else if (data.role === 'vendor') {
                // For vendors, we need the vendor's _id (from Vendor collection)
                // If permanentId is provided, look up the vendor
                let vendorId = data.userId;

                if (data.permanentId) {
                    const vendor = await Vendor.findOne({ permanentId: data.permanentId });
                    if (vendor) {
                        vendorId = vendor._id.toString();
                        socket.data.vendorId = vendorId;
                    }
                }

                socket.join(`vendor:${vendorId}`);
                console.log(`Vendor ${vendorId} connected`);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Client disconnected:', socket.id, 'Reason:', reason);
        });

        // Handle connection timeout
        socket.conn.on('upgrade', () => {
            console.log('Transport upgraded to:', socket.conn.transport.name);
        });

        socket.conn.on('upgradeError', (error) => {
            console.error('Transport upgrade error:', error);
        });
    });

    return io;
};

// Get Socket.IO instance
export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeSocket first.');
    }
    return io;
};

// Emit low stock notification to admin
export const emitLowStockNotification = (vendorName: string, skuName: string, quantity: number) => {
    if (!io) return;

    io.to('admin').emit('low_stock_alert', {
        vendorName,
        skuName,
        quantity,
        timestamp: new Date()
    });
};

// Emit new order notification to vendor
export const emitNewOrderNotification = (vendorId: string, orderId: string, orderData: any) => {
    if (!io) return;

    io.to(`vendor:${vendorId}`).emit('new_order', {
        orderId,
        orderData,
        timestamp: new Date()
    });
};

