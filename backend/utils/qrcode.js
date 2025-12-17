import QRCode from 'qrcode';

export const generateQr = async (data) => QRCode.toDataURL(data);
