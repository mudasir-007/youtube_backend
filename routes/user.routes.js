import express from "express";
import bcrypt from "bcrypt"
import mongoose from "mongoose";
import jwt from "jsonwebtoken"

import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js"
import { checkAuth } from "../middleware/auth.middleware.js";


const router =express.Router();


router.post("/signup", async(req,res)=>{
    try{
        console.log("request ongoing ")
        const hashedPassword= await bcrypt.hash(req.body.password,10);

        const uploadImage=await cloudinary.uploader.upload(
            req.files.logoUrl.tempFilePath);

            console.log("image👉 " ,uploadImage);

        const newUser=new User({
            email:req.body.email,

            password:hashedPassword,

            channelName:req.body.channelName,

            phone:req.body.phone,

            logoUrl:uploadImage.secure_url,

            logoId:uploadImage.public_id,
        });
        let user= await newUser.save()
        res.status(201).json({
            user
        })
    }

    catch(error){
        console.error(error);
        res.status(500).json({
            error,
        });
    }
});
router.post("/login",async(req,res)=>{
    try{
        const existingUser= await User.findOne({email:req.body.email});

        if(!existingUser){
            return res.status(404).json({
                message:"Invalid Cradientials"
            });
        }
        const isvalid =await bcrypt.compare(
            req.body.password,
            existingUser.password
        )
        if(!isvalid){
           return res.status(404).json({
                message:"Invalid Cradientials"
            }); 
        }
        const token=jwt.sign({
            _id: existingUser._id,
            channelName : existingUser.channelName,
            email: existingUser.email,
            phone : existingUser.phone,
            logoId : existingUser.logoId,
        },process.env.JWT_TOKEN, {expiresIn : "10d"});
        res.status(200).json({
            _id: existingUser._id,
            channelName : existingUser.channelName,
            email: existingUser.email,
            phone : existingUser.phone,
            logoId : existingUser.logoId,
            logoUrl : existingUser.logoUrl,
            token:token,
            subscribers: existingUser.subscribers,
            subscribedChannels:existingUser.subscribedChannels
        });
    }
    catch(error){
        console.error(error);
        res.status().json({
            message:error.message,
        });
    }
});

router.put("/update-profile", checkAuth, async (req, res) => {
    try {
        const { channelName, phone } = req.body;

        const updatedData = {};

        if (channelName) updatedData.channelName = channelName;
        if (phone) updatedData.phone = phone;

        // Check if file exists
        if (req.files && req.files.logoUrl) {
            const uploadImage = await cloudinary.uploader.upload(
                req.files.logoUrl.tempFilePath
            );

            updatedData.logoUrl = uploadImage.secure_url;
            updatedData.logoId = uploadImage.public_id;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updatedData,
            { new: true }
        );

        res.status(200).json({
            message: "Profile Updated Successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something went wrong while updating profile"
        });
    }
});
// by defult the user id is  the channel id for otheer person
router.post("/subscribe", checkAuth, async (req, res) => {
    try {
        const { channelId } = req.body;

        // Prevent self-subscription
        if (req.user._id.toString() === channelId) {
            return res.status(400).json({
                message: "You cannot subscribe to your own channel"
            });
        }

        // Check if channel exists
        const channel = await User.findById(channelId);
        if (!channel) {
            return res.status(404).json({
                message: "Channel not found"
            });
        }

        // Add channel only if not already subscribed
        const currentUser = await User.findOneAndUpdate(
            {
                _id: req.user._id,
                subscribedChannels: { $ne: channelId }
            },
            {
                $addToSet: { subscribedChannels: channelId }
            },
            { new: true }
        );
        // If already subscribed
        if (!currentUser) {
            return res.status(400).json({
                message: "Already subscribed"
            });
        }

        // Increment subscriber count only once
        const subscribedUser = await User.findByIdAndUpdate(
            channelId,
            { $inc: { subscribers: 1 } },
            { new: true }
        );
        res.status(200).json({
            message: "Subscribed successfully",
            currentUser,
            subscribedUser
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something went wrong while subscribing"
        });
    }
});
export default router;
