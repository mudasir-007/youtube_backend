import express from "express";
import mongoose from "mongoose";


import cloudinary from "../config/cloudinary.js";
import Video from "../models/vedio.model.js";
import { checkAuth } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js"


const router=express.Router();

/// 👉upload Video
router.post("/upload", checkAuth, async (req, res) => {
  try {
    const { title, description, tags, category } = req.body;
    

    if (!req.files?.video || !req.files?.thumbnail) {
        
      return res.status(400).json({ message: "Video and thumbnail required" });
    }

    if (!req.files.video.mimetype.startsWith("video/")) {
        
      return res.status(400).json({ message: "Invalid video format" });
    }
    
    const videoUpload = await cloudinary.uploader.upload(
      req.files.video.tempFilePath,
      {
        resource_type: "video",
        folder: "videos",
      }
    );

    const thumbnailUpload = await cloudinary.uploader.upload(
      req.files.thumbnail.tempFilePath,
      {
        folder: "thumbnails",
      }
    );

    const newVideo = await Video.create({
      title,
      description,
      user_id: req.user._id,
      videoUrl: videoUpload.secure_url,
      videoId: videoUpload.public_id,
      thumbnailUrl: thumbnailUpload.secure_url,
      thumbnailId: thumbnailUpload.public_id,
      category,
      tags: tags ? tags.split(",") : [],
    });

    res.status(201).json({
      message: "Video uploaded successfully",
      video: newVideo,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// video update (only meta data of video will change)
router.put("/update", checkAuth, async (req, res) => {
  try {
    const { id, title, description, tags, category } = req.body;
    console.log(id);
    

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid video ID" });
    }

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (video.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (req.files?.thumbnail) {
      await cloudinary.uploader.destroy(video.thumbnailId);

      const thumbnailUpload = await cloudinary.uploader.upload(
        req.files.thumbnail.tempFilePath,
        { folder: "thumbnails" }
      );

      video.thumbnailUrl = thumbnailUpload.secure_url;
      video.thumbnailId = thumbnailUpload.public_id;
    }

    video.title = title ?? video.title;
    video.description = description ?? video.description;
    video.category = category ?? video.category;
    video.tags = tags ? tags.split(",") : video.tags;

    await video.save();

    res.status(200).json({
      message: "Video updated successfully",
      video,
    });
  } catch (error) {
    res.status(500).json({
      error: "Something went wrong",
      message: error.message,
    });
  }
});

// 👉🏻 Delete Video
router.delete("/delete" , checkAuth , async (req , res)=>{
  try {
    const {id} = req.body;

    let video = await Video.findById(id);

    if(!video) return res.status(404).json({error:"Video not found!"})

    if(video.user_id.toString() !== req.user._id.toString())
      {
        return res.status(403).json({error:"Unauthorized"})
      }
      

      // Delete from cloudinary
      await cloudinary.uploader.destroy(video.videoId , {resource_type:"video"});
      await cloudinary.uploader.destroy(video.thumbnailId);
      
      await Video.findByIdAndDelete(id);

      res.status(200).json({message:"video deleted successfully"})

  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "something went wrong", message: error.message });
  }
});

// 👉🏻 Get All Videos
router.get("/all" , async (req , res)=>{
  try {
    const videos = await Video.find().sort({createdAt:-1})
    res.status(200).json(videos)
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "something went wrong", message: error.message });
  }
});

// 👉🏻 My Videos
router.get("/my-videos" , checkAuth , async (req , res)=>{
  try {
    const videos = await Video.find({user_id:req.user._id}).sort({createdAt:-1});
    res.status(200).json(videos)
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "something went wrong", message: error.message });
  }
});

//  👉🏻 Get video by category (supports /category/:category and /category?category=)
const handleGetVideosByCategory = async (req, res) => {
  try {
    const category = req.params.category || req.query.category;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const videos = await Video.find({ category }).sort({ createdAt: -1 });

    res.status(200).json(videos);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: error.message });
  }
};

router.get("/category/:category", handleGetVideosByCategory);

// 👉🏻 Get Video by id
router.get("/:id", checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid video ID" });
    }

    // Use findByIdAndUpdate to add the user ID to the viewedBy array if not already present
    const video = await Video.findByIdAndUpdate(
      id,
      {
        $addToSet: { viewedBy: userId },  // Add user ID to viewedBy array, avoiding duplicates
      },
      { new: true }  // Return the updated video document
    );

    if (!video) return res.status(404).json({ error: "Video not found" });

    res.status(200).json(video);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});


//👉 viedo by tag
router.get("/tags/:tag", async (req, res) => {
  try {
    const tag = req.params.tag;
    const videos = await Video.find({ tags: tag }).sort({ createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// 👉🏻 Video Like
router.post("/like" , checkAuth , async (req , res)=>{
  try {
    const {videoId} = req.body;
    
  const video =   await Video.findByIdAndUpdate(videoId , {
      $addToSet:{likedBy:req.user._id},
      $pull:{disLikedBy:req.user._id}
    });
    res.status(200).json({message:"Liked the video" , video})    
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

//👉 video dislike 
router.post("/dislike" , checkAuth , async(req ,res)=>{
  try {
    const { videoId } = req.body;
    await Video.findByIdAndUpdate(videoId, {
      $addToSet: { disLikedBy: req.user._id},
      $pull: { likedBy: req.user._id }, // Remove from likes if previously liked
    });

    
    res.status(200).json({ message: "Disliked the video" });
  } catch (error) {
    console.error("Dislike Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;