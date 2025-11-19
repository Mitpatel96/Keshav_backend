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
                const adminSockets = io.sockets.adapter.rooms.get('admin');
                console.log(`Admin ${data.userId} connected and joined 'admin' room. Total admins: ${adminSockets ? adminSockets.size : 0}`);
            } else if (data.role === 'vendor') {
                // For vendors, we need the vendor's _id (from Vendor collection)
                // If permanentId is provided, look up the vendor
                let vendorId = data.userId;

                if (data.permanentId) {
                    const vendor = await Vendor.findOne({ permanentId: data.permanentId });
                    if (vendor) {
                        vendorId = vendor._id.toString();
                        socket.data.vendorId = vendorId;
                        console.log(`\n=== Vendor Authentication Debug ===`);
                        console.log(`PermanentId received: "${data.permanentId}"`);
                        console.log(`UserId received: "${data.userId}"`);
                        console.log(`Vendor._id from DB: ${vendor._id}`);
                        console.log(`VendorId to use: "${vendorId}"`);
                        console.log(`=====================================\n`);
                    } else {
                        console.warn(`Vendor not found with permanentId: ${data.permanentId}`);
                    }
                } else {
                    console.warn(`⚠️ No permanentId provided for vendor. Using userId: ${vendorId}`);
                }

                // Normalize vendorId to ensure consistent format
                const normalizedVendorId = vendorId.toString().trim();
                const roomName = `vendor:${normalizedVendorId}`;
                socket.join(roomName);
                const vendorSockets = io.sockets.adapter.rooms.get(roomName);
                console.log(`Vendor ${normalizedVendorId} connected and joined '${roomName}' room. Total in room: ${vendorSockets ? vendorSockets.size : 0}`);
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
    if (!io) {
        console.error('Socket.IO not initialized - cannot send low stock notification');
        return;
    }

    const notificationData = {
        vendorName,
        skuName,
        quantity,
        timestamp: new Date()
    };

    // Get all sockets in the 'admin' room
    const adminSockets = io.sockets.adapter.rooms.get('admin');
    const adminCount = adminSockets ? adminSockets.size : 0;

    console.log(`Emitting low stock notification to admin room. Connected admins: ${adminCount}`);
    console.log('Notification data:', notificationData);

    io.to('admin').emit('low_stock_alert', notificationData);
};

// Emit new order notification to vendor
export const emitNewOrderNotification = (vendorId: string, orderId: string, orderData: any) => {
    if (!io) {
        console.error('Socket.IO not initialized - cannot send new order notification');
        return;
    }

    // Normalize vendorId to string and trim
    const normalizedVendorId = vendorId.toString().trim();
    const roomName = `vendor:${normalizedVendorId}`;

    // Ensure orderData has all required fields
    const completeOrderData = {
        orderCode: orderData?.orderCode || null,
        orderVFC: orderData?.orderVFC || null,
        totalAmount: orderData?.totalAmount || 0,
        items: Array.isArray(orderData?.items) ? orderData.items : [],
        user: orderData?.user || null
    };

    const notificationData = {
        orderId,
        orderData: completeOrderData,
        timestamp: new Date().toISOString()
    };

    // Get all sockets in the vendor room
    const vendorSockets = io.sockets.adapter.rooms.get(roomName);
    const vendorCount = vendorSockets ? vendorSockets.size : 0;

    // Debug: List all vendor rooms to see what's available
    const allRooms = io.sockets.adapter.rooms;
    const vendorRooms: string[] = [];
    allRooms.forEach((sockets, room) => {
        if (room.startsWith('vendor:')) {
            vendorRooms.push(`${room} (${sockets.size} socket${sockets.size !== 1 ? 's' : ''})`);
        }
    });

    console.log(`\n=== New Order Notification Debug ===`);
    console.log(`Target room: ${roomName}`);
    console.log(`VendorId received: "${vendorId}" (type: ${typeof vendorId})`);
    console.log(`Normalized vendorId: "${normalizedVendorId}"`);
    console.log(`Connected vendors in target room: ${vendorCount}`);
    console.log(`Available vendor rooms:`, vendorRooms.length > 0 ? vendorRooms : 'None');
    console.log(`Notification payload:`, JSON.stringify(notificationData, null, 2));
    console.log(`=====================================\n`);

    if (vendorCount === 0) {
        console.warn(`⚠️ WARNING: No vendors connected to room ${roomName}. Notification will not be received.`);
        console.warn(`Available vendor rooms: ${vendorRooms.join(', ')}`);
    } else {
        console.log(`✅ Sending notification to ${vendorCount} vendor(s) in room ${roomName}`);
    }

    io.to(roomName).emit('new_order', notificationData);
};

