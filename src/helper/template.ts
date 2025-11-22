export const welcomeEmailTemplate = (data: any) => {
    // console.log("inside welcomeEmail", data)
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Welcome Email</title>
    <style>
        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>

<body>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" bgcolor="#f6f6f6" height="100%" valign="top" width="100%"
                    style="padding:0 15px 50px 15px">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%"
                        style="max-width:600px;background-color:white">
                        <tbody>
                            <tr>
                                <td bgcolor="#ffffff">
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                        <tbody>
                                            <tr>
                                                <td style="padding:30px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <p style="margin:0">
                                                    Thank you for joining <strong>Keshav Products</strong>! We're thrilled to have you with us—happy shopping! Below are your login details:
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:20px 40px 0px 40px;text-align:left">
                                                    <h3 style="margin:0;font-family:'Poppins',sans-serif;font-size:16px;line-height:40px;color:#333333;font-weight:bold;letter-spacing:1px">
                                                        Dear ${data.name},
                                                    </h3>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:0px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <p style="margin:0">
                                                        Your account has been successfully set up, and here are your login details to get started:
                                                    </p>
                                                    <br>
                                                    <strong>Email:</strong> ${data.email}
                                                    <strong><p>Your Password is <b>${data.otp}</b>. Do not share it with anyone.</p></strong> 
                                                    <p>If you have any questions or need assistance, don't hesitate to reach out to our support team. We are here to ensure your experience is seamless and rewarding every step of the way.</p>
                                                    <p>Thank you for choosing Keshav Products. Together, we will make your reviews impactful and valuable!</p>
                                                    <p>&nbsp;</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#ffffff">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                        <tbody>
                            <tr>
                                <td align="center" bgcolor="" height="100%" valign="top" width="100%"
                                    style="padding:10px 0px 0px 0px">
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                                        <tbody>
                                            <tr>
                                                <td style="padding:2px 40px 10px 40px;font-family:sans-serif;font-size:12px;line-height:18px;color:#262729;text-align:center;font-weight:normal">
                                                    <p style="margin:0; font-size: 14px;">Copyright © 2023. All rights reserved.</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>
</body>
</html>
`
}

export const weeklyWarehouseTimingEmailTemplate = (data: {
    vendorName: string;
    vendorPhone: string;
    warehouseTimings: Array<{ day: string; startTime: string; endTime: string; isOpen: boolean }>;
}) => {
    const formatDayName = (day: string) => {
        return day.charAt(0).toUpperCase() + day.slice(1);
    };

    const timingsHtml = data.warehouseTimings && data.warehouseTimings.length > 0
        ? `
            <tr>
                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                    <h4 style="margin:0 0 10px 0;font-size:16px;color:#333333;font-weight:bold">Warehouse Timings:</h4>
                    <table border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:10px">
                        <thead>
                            <tr style="background-color:#f6f6f6">
                                <th style="text-align:left;padding:8px;font-weight:bold">Day</th>
                                <th style="text-align:left;padding:8px;font-weight:bold">Timings</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.warehouseTimings.map(timing => `
                                <tr>
                                    <td style="padding:8px">${formatDayName(timing.day)}</td>
                                    <td style="padding:8px">${timing.isOpen ? `${timing.startTime} - ${timing.endTime}` : 'Closed'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </td>
            </tr>
        `
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Warehouse Timings</title>
    <style>
        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>
<body>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" bgcolor="#f6f6f6" height="100%" valign="top" width="100%" style="padding:0 15px 50px 15px">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:white">
                        <tbody>
                            <tr>
                                <td bgcolor="#ffffff">
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                        <tbody>
                                            <tr>
                                                <td style="padding:30px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <h2 style="margin:0;color:#333333;font-weight:bold">Weekly Warehouse Timings Update</h2>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <p style="margin:0">From today until Sunday, ${data.vendorName}'s warehouse will be open at the following timings.</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <p style="margin:5px 0"><strong>Vendor:</strong> ${data.vendorName}</p>
                                                    <p style="margin:5px 0"><strong>Vendor Phone:</strong> ${data.vendorPhone}</p>
                                                </td>
                                            </tr>
                                            ${timingsHtml}
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#ffffff">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                        <tbody>
                            <tr>
                                <td align="center" bgcolor="" height="100%" valign="top" width="100%" style="padding:10px 0px 0px 0px">
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                                        <tbody>
                                            <tr>
                                                <td style="padding:2px 40px 10px 40px;font-family:sans-serif;font-size:12px;line-height:18px;color:#262729;text-align:center;font-weight:normal">
                                                    <p style="margin:0; font-size: 14px;">Copyright © 2023. All rights reserved.</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>
</body>
</html>
`;
}

export const orderConfirmationEmailTemplate = (data: {
    orderName: string;
    orderCode: string;
    orderVFC: string;
    products: Array<{ name: string; quantity: number }>;
    vendorName: string;
    vendorPhone: string;
    warehouseTimings?: Array<{ day: string; startTime: string; endTime: string; isOpen: boolean }>;
    totalAmount: number;
    discountAmount?: number;
}) => {
    const formatDayName = (day: string) => {
        return day.charAt(0).toUpperCase() + day.slice(1);
    };

    const timingsHtml = data.warehouseTimings && data.warehouseTimings.length > 0
        ? `
            <tr>
                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                    <h4 style="margin:0 0 10px 0;font-size:16px;color:#333333;font-weight:bold">Warehouse Timings:</h4>
                    <table border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:10px">
                        <thead>
                            <tr style="background-color:#f6f6f6">
                                <th style="text-align:left;padding:8px;font-weight:bold">Day</th>
                                <th style="text-align:left;padding:8px;font-weight:bold">Timings</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.warehouseTimings.map(timing => `
                                <tr>
                                    <td style="padding:8px">${formatDayName(timing.day)}</td>
                                    <td style="padding:8px">${timing.isOpen ? `${timing.startTime} - ${timing.endTime}` : 'Closed'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </td>
            </tr>
        `
        : '';

    const productsHtml = data.products.map(product => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${product.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${product.quantity}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>
<body>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" bgcolor="#f6f6f6" height="100%" valign="top" width="100%" style="padding:0 15px 50px 15px">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:white">
                        <tbody>
                            <tr>
                                <td bgcolor="#ffffff">
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                        <tbody>
                                            <tr>
                                                <td style="padding:30px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <h2 style="margin:0;color:#333333;font-weight:bold">Order Confirmation</h2>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <p style="margin:0">Thank you for your order! Your order has been placed successfully.</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <h3 style="margin:0 0 10px 0;font-size:16px;color:#333333;font-weight:bold">Order Details:</h3>
                                                    <p style="margin:5px 0"><strong>Order Name:</strong> ${data.orderName}</p>
                                                    <p style="margin:5px 0"><strong>Order Code:</strong> ${data.orderCode}</p>
                                                    <p style="margin:5px 0"><strong>Order Verification Code:</strong> <strong style="font-size:18px;color:#007bff">${data.orderVFC}</strong></p>
                                                    <p style="margin:5px 0"><strong>Vendor:</strong> ${data.vendorName}</p>
                                                    <p style="margin:5px 0"><strong>Vendor Phone:</strong> ${data.vendorPhone}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <h4 style="margin:0 0 10px 0;font-size:16px;color:#333333;font-weight:bold">Products:</h4>
                                                    <table border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:10px">
                                                        <thead>
                                                            <tr style="background-color:#f6f6f6">
                                                                <th style="text-align:left;padding:8px;font-weight:bold">Product</th>
                                                                <th style="text-align:center;padding:8px;font-weight:bold">Quantity</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${productsHtml}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                            ${timingsHtml}
                                            <tr>
                                                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <p style="margin:10px 0"><strong>Total Amount:</strong> ₹${data.totalAmount.toFixed(2)}</p>
                                                    ${data.discountAmount ? `<p style="margin:5px 0"><strong>Discount:</strong> ₹${data.discountAmount.toFixed(2)}</p>` : ''}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:20px 40px 0px 40px;font-family:'Poppins',sans-serif;text-align:left;font-size:14px;line-height:24px;font-weight:500;letter-spacing:0.05em;color:#555b6c">
                                                    <p style="margin:10px 0"><strong>Please present your verification code (${data.orderVFC}) when picking up your order.</strong></p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#ffffff">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                        <tbody>
                            <tr>
                                <td align="center" bgcolor="" height="100%" valign="top" width="100%" style="padding:10px 0px 0px 0px">
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                                        <tbody>
                                            <tr>
                                                <td style="padding:2px 40px 10px 40px;font-family:sans-serif;font-size:12px;line-height:18px;color:#262729;text-align:center;font-weight:normal">
                                                    <p style="margin:0; font-size: 14px;">Copyright © 2023. All rights reserved.</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>
</body>
</html>
`;
}

