import express from 'express';
import { delete_file, image_compress_response, uploadS3 } from '../helper/s3'
const router = express.Router();

router.post('/image', uploadS3.single('image'), image_compress_response)
router.post('/image/:file', uploadS3.single('image'), image_compress_response)
router.post('/upload', uploadS3.single('file'), image_compress_response)
router.post('/delete_file', delete_file)

export default router