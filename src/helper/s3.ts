"use strict"
import multer from 'multer'
import multerS3 from 'multer-s3'
import { NextFunction, Request, Response } from 'express'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import "dotenv/config";
import sharp from "sharp";
import { apiResponse, URL_decode } from '../common/functions'
import { logger, reqInfo } from './winston_logger'
import { responseMessage } from './response'

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESSKEYID,
        secretAccessKey: process.env.AWS_SECRETACCESSKEY,
    },
});

const bucket_name = process.env.AWS_BUCKETNAME;
const project = "project"

export const convertToWebp = async (req: any, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return next();
        }
        logger.info('Converting image to WebP');
        const webpBuffer = await sharp(req.file.buffer)
            .webp({ quality: 80 })
            .toBuffer();

        req.file.buffer = webpBuffer;
        req.body.size = webpBuffer.length / 1048576;
        next();
    } catch (error) {
        logger.error('Error converting image to WebP', error);
        return res.status(500).json(await apiResponse(500, responseMessage?.internalServerError, {}, error));
    }
};

export const uploadS3 = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: bucket_name,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req: any, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req: any, file, cb) {
            logger.info('Processing file for upload');
            req.body.location = `${project}/${req.params.file}/${Date.now().toString()}.webp`;
            cb(null, req.body.location);
        },
    }),
});


export const image_compress_response = async (req: Request, res: Response) => {
    reqInfo(req)
    console.log("req.bdoy", req.body)
    try {
        let headerList: any = req.originalUrl.split("/")
        headerList = headerList[headerList?.length - 2]
        return res.status(200).json(await apiResponse(200, responseMessage?.customMessage("image successfully uploaded!"), { image: req.body.location, size: req.body.size }, {}))
    } catch (error) {
        console.log(error)
        return res.status(500).json(await apiResponse(500, responseMessage?.internalServerError, {}, error));
    }
}

export const delete_file = async (req: Request, res: Response) => {
    reqInfo(req)
    let { url } = req.body
    try {
        let [folder, file,] = await URL_decode(url)
        let message = await deleteImage(file, folder)
        return res.status(200).json(await apiResponse(200, `${message}`, {}, {}))
    } catch (error) {
        console.log(error)
        return res.status(400).json(await apiResponse(400, responseMessage?.internalServerError, {}, error));
    }
}

export const deleteImage = async function (file: any, folder: any) {
    return new Promise(async function (resolve, reject) {
        try {
            const bucketPath = `${folder}/${file}`
            let params = {
                Bucket: `${bucket_name}`,
                Key: bucketPath
            }
            const result = await s3Client.send(new DeleteObjectCommand(params));
            logger.info("File successfully delete")
            resolve("File successfully delete")
        } catch (error) {
            console.log(error)
            reject()
        }
    })
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

export const upload = multer({ storage: storage });
