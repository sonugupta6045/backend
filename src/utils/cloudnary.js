import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDNARY_CLOUD_NAME,
  cloud_api: process.env.CLOUDNARY_CLOUD_API,
  cloud_secret: process.env.CLOUDNARY_CLOUD_SECRET,
});

const uploadOnCloudnary  = async(localFilePath) => {
    try {
        if(!localFilePath) return null;

        // upload file on cloudnary 
      const respone =  await  cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        // file has been uploaded successfull
        console.log("file is uploadate succesfully", respone.url);
        return respone;
        
        
    } catch (error) {
        fs.unlinkSync(localFilePath)   // remove the locally  saved temproray file as the upload  operation got failed

        return null;

    }
}

export { uploadOnCloudnary}