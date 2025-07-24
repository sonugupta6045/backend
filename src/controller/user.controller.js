import { asyncHandler } from "../utils/asynHandler.js";

import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.Model.js";

import { uploadOnCloudnary } from "../utils/cloudnary.js";

import { ApiResponse } from "../utils/ApiRespone.js";
import jwt from "jsonwebtoken";
import { subscribe } from "diagnostics_channel";
import mongoose from "mongoose";
import { use } from "react";
 
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "something getting worng while generating token");
  }
};

const registerUser = asyncHandler(async (req, res) => {
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
  const { fullname, email, username, password } = req.body;
    console.log("email", email);

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all field are required");
  }
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  if (!isValidEmail(email)) {
    throw new ApiError(400, "please enter a vaild email");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(400, "User email and username already extist");
  }

  //   console.log(req.files);

  // const avatarLocalPath  =  req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!req.files || !req.files.avatar || !req.files.avatar[0]) {
    throw new ApiError(400, "avatar file is missing");
  }

  const avatarLocalPath = req.files.avatar[0].path;
  console.log("Uploading avatar from path:", avatarLocalPath);

  let avatar;
  try {
    avatar = await uploadOnCloudnary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(400, "Avatar upload failed");
    }
  } catch (error) {
    console.error("Cloudinary avatar upload error:", error);
    throw new ApiError(500, "Error uploading avatar to Cloudinary");
  }

  //
  const coverImage = await uploadOnCloudnary(coverImageLocalPath);

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  const createUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createUser) {
    throw new ApiError(400, "Something get worng while creating the user");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createUser, "user registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loginUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true, // use false for local dev if not using HTTPS
    sameSite: "None", // add this if using cross-site cookies
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loginUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});


const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true, // Use false if not using HTTPS in dev
    sameSite: "None", // Optional: required for cross-origin cookies
  };

  // ✅ Correct method is clearCookie (not clearCookies)
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefresh =  req.cookies.refreshToken || req.body

  if(!incomingRefresh) {
    throw new ApiError(401, "unauthorized request")
  }
   try {
    const decodedToken = jwt.verify(
     incomingRefresh,
     process.env.REFRESH_TOKEN_SECRET
   )
   const user =  await User.findById(decodedToken?._id)
 
   if(!user){
     throw new ApiError(401, " invalid refresh token")
   }
 
   if(incomingRefresh !== user?.refreshToken){
     throw new ApiError(401, "Refresh token is expired or used ")
   }
 
   const options ={
     httpOnly:true,
     secure : true
   }
   const { accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
 
   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken", newRefreshToken,options)
   .json (
     new ApiResponse(
       200,
       {accessToken, refreshToken:newRefreshToken},
       "Access Token refreshed"
     )
   )
     
   } catch (error) {
    throw new ApiError(401, " Invalid refresh Token")
   }
  

})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)
   const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid Old Passowrd")
   }

   user.password = newPassword
  await  user.save({validateBeforeSave:false})

  return res.status(200)
  .json(new ApiResponse(
    200,
    {},
    "Password changed Successfully"
  ))

})

const getCurrentUser = asyncHandler(async(req, res)=>{
  return res
  .status(200)
  .json( new ApiResponse (200, req.user, "current user fetched successfully"))
}) 

const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {fullname, email, username} = req.body
  if(!fullname || !email){
    throw new ApiError(400, "All fields are required")
  }

   const user =  await User.findByIdAndUpdate(req.user?._id, {
    $set:{
      fullname,
      email,
      username
    }
  }, {new:true}).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "Account details updated"))


})

const updateUserAvatar = asyncHandler(async(req, res)=>{
   const  avatarLocalPath =  req.file?.path
   if(!avatarLocalPath) {
    throw new ApiError(400, "avatar file is missing")
   }
   // delete the old url of the 
   const CurrentUser = await User.findById(req.user?._id)
   if(CurrentUser?.avatar){
    const segments = CurrentUser.avatar.split('/')
    const publicIdWithExtension = segments[segments.length-1]
    const publicId = publicIdWithExtension.split('.')[0];

    await cloudinary.uploader.destroy(publicId);
    
   }

   const avatar =  await uploadOnCloudnary(avatarLocalPath)

   if(!avatar.url){
        throw new ApiError(400, "Error while uploading the file on the avatar")

   }

   const user =  await User.findByIdAndUpdate(req.user?._id, {

    $set: {
      avatar: avatar.url
    }
   },{
    new: true
   }).select("-password")

   return res.status(200)
  .json( new ApiResponse(200, user, "Avatar Images is Update is successfully"))

})

const updateUserConverImage = asyncHandler(async(req, res)=>{
  const CoverImageLocalPath = req.file?.path
  if(!CoverImageLocalPath){
    throw new ApiError(400, " Cover Image files is Misssing")

  }

  const coverImage = await uploadOnCloudnary(CoverImageLocalPath)
  if(!coverImage) {
    throw new ApiError(400, "Error while uploading the file of the Cover Image")
  }
  const user = await User.findByIdAndUpdate(req.user?._id,{
    coverImage : coverImage.url
  },{
    new: true
  })

  return res.status(200)
  .json(new ApiResponse(200, user, "Cover Images is Update is successfully"))


})

const getUserChannelProfile =  asyncHandler(async(req, res)=>{

   const {username} = req.params

   if(!username?.trim()){
    throw new ApiError(400, "username is missing")
   }

   const channel = await  User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup : {
        from: "subscriptions",
        localField: "_id",
        foreignField:"channel",
        as : "subscribers"
      }
    },
    {
      $lookup:{
         from: "subscriptions",
        localField: "_id",
        foreignField:"subscriber",
        as : "subscribedTO"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size:"$subscribers"
        },
        channelsSubscribedToCount : {
          $size: "$subscribedTO"
        },
        isSubscribed:{
          $cond : {
            if:{$in:[req.user?._id, "$subscribers.subscriber"]},
            then : true,
            else: false
          }
        }
      }
    },
    {
      $project :{
        fullname : 1,
        username: 1,
        subscribersCount:1,
        channelsSubscribedToCount:1,
        isSubscribed:1,
        avatar: 1,
        coverImage:1,
        email:1



      }
    }
   ])
   if(!channel?.length){
    throw new ApiError(400, "Channel does not exists")
   }
  //  console.log(channel)
  return res.status(200)
  .json( new ApiResponse(200, channel[0], "User channel fetched successfully"))
   console.log(channel)

})

const getWatchHistory = asyncHandler(async(req, res)=>{
  const user =  await User.aggregate([
    {
      $match:{
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {

    $lookup:{
      from : "videos",
      localField: "watchHistory",
      foreignField: "_id",
      as: "watchHistory",
      pipeline: [
        {
          $lookup : {
            from : "users",
            localField: "owner",
            foreignField : "_id",
            as : owner,
            pipeline :{
              $project : {
                fullname:1,
                username:1,
                avatar:1



              }
            }
          }
        },
        {
          $addFields : {
            owner : {
              $first : "$owner"
            }
          }
        }
      ]
    }
  }
  ])

  return res.status(200)
  .json( new ApiResponse(200, 
    user[0].watchHistory,
    " Watch History are Fetched successfully"
  ))
})


export { registerUser, loginUser, logoutUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails,updateUserAvatar, updateUserConverImage, getUserChannelProfile,getWatchHistory };
