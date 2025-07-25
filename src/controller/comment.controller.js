import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, " invalid video ID")
    }

    const comment = await Comment.find({videoId})
        .populate("userId", "username avatar")
        .sort({createdAt:-1})
        .skip((page -1)*limit)
        .limit(Number(limit))

    const Total =  await Comment.countDocuments({videoId})

    return res.status(200)
    .json(new ApiResponse(200, {Total, page:Number(page),limit:Number(limit), comment},"Comment fetched successfully"))

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId, content} = await req.body;

    if(!videoId || !content) {
        throw new ApiError(400, "Video Id and content are required")
    }

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid video ID")
    }

    const comment = await Comment.create({
        content,
        videoId,
        userId : req.user?._id
    })

    return res.status(200)
    .json(new ApiResponse(200, comment,"comment added successfully"))


})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;
    if(!commentId) {
        throw new ApiError(400, " Comment Id are not found")
    }
    if(!content){
        throw new ApiError(400, " content is required to update the comment")
    }

    const comment = await Comment.findOne({_id:commentId,userId: req.user?._id})
    comment.content = content;
    await comment.save();

    return res.status(200)
    .json(new ApiResponse(200, comment, "comment updated successfully"))

})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;

    if(!commentId) {
        throw new ApiError(400, "comment Id is required")
    }
     const comment = await Comment.findByIdAndDelete({_id:commentId, userId:req.user._id})

     return res.status(200)
     .json(new ApiResponse(200, comment, "comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }