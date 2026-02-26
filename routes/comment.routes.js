import express from "express"
import mongoose from "mongoose"


import Comment from "../models/comment.model.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/new-comment", checkAuth, async (req, res) => {
    try {
        const { video_id, commentText } = req.body;
        console.log(video_id);
        

        if (!video_id || !commentText) {
            return res.status(400).json({
                message: "video_id and commentText are required"
            });
        }


        const newComment = new Comment({
            video_id,
            commentText,
            user_id: req.user._id
        });

        await newComment.save();

        res.status(201).json({
            message: "New comment added successfully",
            comment: newComment
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });
    }
});

router.get("/get-comment/:videoId", checkAuth, async (req, res) => {
    try {
        const { videoId } = req.params;

        const comments = await Comment.find({ video_id: videoId })
            .populate("user_id", "channelName logoUrl")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            comments
        });

    } catch (error) {
        console.error("Error while fetching comments by video id", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch comments",
            error: error.message
        });
    }
});

export default router;