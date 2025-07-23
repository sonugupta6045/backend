import { asyncHandler } from "../utils/asynHandler.js";

import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.Model.js";

import { uploadOnCloudnary } from "../utils/cloudnary.js";

import { ApiResponse } from "../utils/ApiRespone.js";
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
  //   console.log("email", email);

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
  // req body -> data
  // username or email
  // find the user || validate
  // password check
  // access and refresh token generate
  // send cookie

  const { email, username, password } = req.body;

  if (!username || !email) {
    throw new ApiError(400, "username or password is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "User does not extis");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid User credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loginUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return;
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
        "User logged in Successfully"
      )
    );

  const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
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
      httpOnly : true,
      secure : true
    }
  });

  return res.status(200).clearCookies("accessToken",options)
  .clearCookies("refreshToken", options)
  .json(new ApiResponse(200, {}, "User Logged Out"))
});

export { registerUser, loginUser, logoutUser };
