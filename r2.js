const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

async function uploadToR2(buffer, key, mime) {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mime,
    ContentDisposition: "inline" // 🔥 thêm dòng này
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

module.exports = { uploadToR2 };
