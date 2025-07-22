import { asyncHandler } from "../utils/asynHandler.js";

import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.Model.js"
import { uploadOnCloudnary } from "../utils/cloudnary.js";

import { ApiResponse } from "../utils/ApiRespone.js";

const registerUser = asyncHandler(async (req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images , check for avater
    // upload to cloudnry
    //check the upload on the couldnary
    // create user objects - create entry in db
    // remove password and refresh token feid from respone 
    // check for user creation
    // retunr respone
    const  {fullname, email, username, password} = req.body
    console.log("email", email);

    if(
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "all field are required")
    }
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email)
    }
    if (!isValidEmail(email)) {
        throw new ApiError(400, "please enter a vaild email")
    }
    
    //  const  existingUser =  User.findOne({
    //     $or : [{username},{email}]
    // })

    // if(existingUser){
    //     throw new ApiError(400, "User email and username already extist")
    // }

    const avatarLocalPath  =  req.files?.avatar[0]?.path;
    const coverImageLocalPath =  req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "avater is required")
    }
    
     const avater =  await uploadOnCloudnary(avatarLocalPath)
     const coverImage = await uploadOnCloudnary(coverImageLocalPath)
     if(!avater) {
        throw new ApiError(400, "avatar is required filed ")
     }

     const user =  await User.create({
        fullname,
        avater:avater.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
     })
  const createUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createUser) {
    throw new ApiError(400, "Something get worng while creating the user")
  }
  return res.status(201).json(
    new ApiResponse(200,createUser,"user registered successfully")
  )
     

})

export {registerUser}