import express from "express";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import bodyParser from "body-parser";

import  connectDB  from "./config/db.config.js";
import userRoutes from "./routes/user.routes.js";
import vedioRoutes from "./routes/video.routes.js"
import commentRoutes from "./routes/comment.routes.js";

dotenv.config()

const PORT=process.env.PORT || 3000
const app=express();

connectDB();

app.use(express.json());
app.use(fileUpload({
    useTempFiles:true,
    tempFileDir:"/tmp/"
}));

app.use("/api/v1/user",userRoutes);
app.use("/api/v1/vedio", vedioRoutes)
app.use("/api/v1/comment", commentRoutes)


app.listen(PORT,()=>{
    console.log(`setver is running on port http://localhost:${PORT}`)
});